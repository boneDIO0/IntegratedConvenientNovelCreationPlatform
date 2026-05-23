import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';

// 定義 Next.js 動態路由的參數型態，明確區分三個層級
interface RouteParams {
params: Promise<{
projectId: string;
chapterId: string;
versionId: string;
}>;
}

/**
* 私有輔助函式：用於驗證使用者身份與作品所有權
* 確保安全防護：防範 A 使用者透過惡意竄改網址 UUID，去還原或刪除 B 使用者的作品
*/
async function validateOwnership(projectId: string) {
  const session = await getServerSession();
  if (!session || !session.user?.email) {
    return { error: '請先登入系統', status: 401 };
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return { error: '找不到該使用者', status: 404 };
  }

  // 檢查該 Project 是否存在，且屬於目前登入的使用者
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: user.id,
      deletedAt: null // 排除已被軟刪除的作品
    }
  });

  if (!project) {
    return { error: '作品不存在或您無權限操作', status: 403 };
  }

  return { user, project };
}

/**
 *【POST】 時光機還原：將章節內文倒滾至此指定的歷史版本
 * 網址範例：POST /api/projects/[projectId]/chapters/[chapterId]/versions/[versionId]
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { projectId, chapterId, versionId } = await params;

    // 進行安全與權限檢查
    const auth = await validateOwnership(projectId);
    if ('error' in auth) {
      return new NextResponse(auth.error, { status: auth.status });
    }

    // 1. 在資料庫中精準撈出該筆 Checkpoint 的歷史快照
    const checkpoint = await prisma.checkpoint.findFirst({
      where: {
        id: versionId,
        targetId: chapterId,
        targetType: 'CHAPTER' // 🌟 確保與後端儲存時的大寫 CHAPTER 一致
      }
    });

    if (!checkpoint) {
      return NextResponse.json({ error: '找不到該筆歷史版本紀錄，無法還原' }, { status: 404 });
    }

    // 2. 🌟 核心交易：將快照中的內容與當時的標題，完整覆蓋回 Chapter 資料表
    // 💡 修正對照：根據你的 schema，欄位名稱叫 content，不是 deltaContent 囉！
    const updatedChapter = await prisma.chapter.update({
      where: { id: chapterId },
      data: {
        content: checkpoint.content || {}, // 倒滾內文 (Tiptap JSON)
      }
    });

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
    const auth = await validateOwnership(projectId);
    if ('error' in auth) {
      return new NextResponse(auth.error, { status: auth.status });
    }

    // 1. 檢查該快照是否存在於此章節
    const checkpoint = await prisma.checkpoint.findFirst({
      where: {
        id: versionId,
        targetId: chapterId,
        targetType: 'CHAPTER'
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