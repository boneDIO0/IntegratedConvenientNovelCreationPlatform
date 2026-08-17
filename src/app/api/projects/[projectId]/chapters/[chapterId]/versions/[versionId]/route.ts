import { NextResponse } from 'next/server';
import { verifyProjectAccess } from '@/lib/auth-utils';
import { PROJECT_ROLES } from '@/lib/roles';
import prisma from '@/lib/prisma';

// 定義 Next.js 動態路由的參數型態
interface RouteParams {
  params: Promise<{
    projectId: string;
    chapterId: string;
    versionId: string;
  }>;
}

/**
 *【POST】 時光機還原：將章節內文倒滾至此指定的歷史版本
 * 網址範例：POST /api/projects/[projectId]/chapters/[chapterId]/versions/[versionId]
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { projectId, chapterId, versionId } = await params;

    // 進行安全與權限檢查
    const auth = await verifyProjectAccess(projectId, [
      PROJECT_ROLES.OWNER,
      PROJECT_ROLES.EDITOR
    ]);
    if (!auth.isAuthorized || !auth.userId) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // 1. 在資料庫中精準撈出該筆 Checkpoint 的歷史快照
    const checkpoint = await prisma.checkpoint.findFirst({
      where: {
        id: versionId,
        targetId: chapterId,
        targetType: {
          equals: 'CHAPTER',
          mode: 'insensitive'
        }
      }
    });

    if (!checkpoint) {
      return NextResponse.json({ error: '找不到該筆歷史版本紀錄，無法還原' }, { status: 404 });
    }

    // 準備通知所需的關聯資料
    const [project, actor, members, currentChapter] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId }, select: { title: true, ownerId: true } }),
      prisma.user.findUnique({ where: { id: auth.userId }, select: { name: true } }),
      prisma.projectMember.findMany({ where: { projectId: projectId }, select: { userId: true } }),
      prisma.chapter.findUnique({ where: { id: chapterId }, select: { title: true } })
    ]);

    const projectName = project?.title || '未知專案';
    const actorName = actor?.name || '某人';
    const chapterTitle = currentChapter?.title || '未知章節';
    
    // 優先使用手動命名，若無則使用備註，最後 fallback 到時間
    const versionName = checkpoint.name 
      ? checkpoint.name 
      : (checkpoint.commitMsg || new Date(checkpoint.createdAt || Date.now()).toLocaleString());

    // 建立資料庫交易陣列
    const dbOperations: any[] = [
      prisma.chapter.update({
        where: { id: chapterId },
        data: {
          content: checkpoint.content || {},
        }
      })
    ];

    // 整理接收者名單：包含所有成員與擁有者，並排除執行還原的作者自己
    const recipientIds = new Set(members.map(m => m.userId));
    if (project?.ownerId) recipientIds.add(project.ownerId);
    recipientIds.delete(auth.userId);

    // 如果有其他協作者，推入發送通知的任務
    if (recipientIds.size > 0) {
      const notifications = Array.from(recipientIds).map(userId => ({
        recipientId: userId,
        actorId: auth.userId,
        type: 'SYSTEM' as const,
        projectId: projectId,
        targetId: chapterId,
        message: `⚠️ ${actorName} 將《${projectName}》的章節「${chapterTitle}」還原至歷史版本：「${versionName}」`,
        link: `/novel_list/${projectId}/editor/${chapterId}`
      }));

      dbOperations.push(
        prisma.notification.createMany({
          data: notifications
        })
      );
    }

    // 更新章節內文 + 發送通知
    const results = await prisma.$transaction(dbOperations);
    const updatedChapter = results[0];

    // 3. 回傳成功訊息與最新內文，讓前端 Tiptap 編輯器能立刻使用
    // 💡 貼心小提醒：這邊回傳的格式包含了 { content: ... }，正好與我們在主網頁寫的 setLatestRestoredContent(data.content) 完美契合！
    return NextResponse.json({
      message: '章節已成功還原至指定歷史版本',
      content: updatedChapter.content
    }, { status: 200 });

  } catch (error) {
    console.error('還原版本失敗 (POST Error):', error);
    return NextResponse.json({ error: '內部伺服器錯誤，還原失敗' }, { status: 500 });
  }
}

/**
 * 🗑️ 2. 【DELETE】 抹除歷史：刪除特定的一筆版本紀錄
 * 網址範例：DELETE /api/projects/[projectId]/chapters/[chapterId]/versions/[versionId]
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { projectId, chapterId, versionId } = await params;

    // 進行安全與權限檢查
    const auth = await verifyProjectAccess(projectId, [
      PROJECT_ROLES.OWNER,
      PROJECT_ROLES.EDITOR
    ]);
    if (!auth.isAuthorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // 1. 檢查該快照是否存在於此章節
    const checkpoint = await prisma.checkpoint.findFirst({
      where: {
        id: versionId,
        targetId: chapterId,
        targetType: {
          equals: 'CHAPTER',
          mode: 'insensitive'
        }
      }
    });

    if (!checkpoint) {
      return NextResponse.json({ error: '找不到該筆版本紀錄' }, { status: 404 });
    }

    // 2. 🌟 自行維護 Git 鏈狀結構（保留你優秀的原生代碼，防止歷史鏈條斷掉）：
    if (checkpoint.parentId) {
      await prisma.checkpoint.updateMany({
        where: { parentId: versionId },
        data: { parentId: checkpoint.parentId }
      });
    }

    // 3. 從資料庫中刪除該筆 Checkpoint 歷史
    await prisma.checkpoint.delete({
      where: { id: versionId }
    });

    // 4. RESTful 規範修正：原本回傳 204 No Content 雖然標準，但前端 fetch 如果用 res.json() 會解構失敗
    // 為了配合前端側邊欄順利執行，我們改成回傳一個 200 成功 JSON 物件
    return NextResponse.json({ success: true, message: "歷史紀錄已成功抹除" }, { status: 200 });

  } catch (error) {
    console.error('刪除版本紀錄失敗 (DELETE Error):', error);
    return NextResponse.json({ error: '內部伺服器錯誤，刪除失敗' }, { status: 500 });
  }
}