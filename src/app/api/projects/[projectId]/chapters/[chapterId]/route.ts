import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyProjectAccess } from '@/lib/auth-utils'
import { PROJECT_ROLES } from '@/lib/roles'

// 📥 讀取：撈出這個章節的標題與內容
export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string; chapterId: string }> }
) {
  try {
    const { projectId, chapterId } = await context.params

    const authCheck = await verifyProjectAccess(projectId, [
      PROJECT_ROLES.OWNER,
      PROJECT_ROLES.EDITOR,
      PROJECT_ROLES.VIEWER
    ])

    if (!authCheck.isAuthorized) {
      return new NextResponse(authCheck.error, { status: authCheck.status })
    }

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId }
    })

    if (!chapter) return new NextResponse("找不到章節", { status: 404 })

    return NextResponse.json(chapter)
  } catch (error) {
    console.error("GET Chapter Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

// ✏️ 儲存：更新章節的標題與編輯器內容，並同時建立 Checkpoint 歷史紀錄
export async function PUT(
  request: Request,
  context: { params: Promise<{ projectId: string; chapterId: string }> }
) {
  try {
    const { projectId, chapterId } = await context.params

    const authCheck = await verifyProjectAccess(projectId, [
      PROJECT_ROLES.OWNER,
      PROJECT_ROLES.EDITOR
    ])

    if (!authCheck.isAuthorized || !authCheck.userId) {
      return new NextResponse(authCheck.error, { status: authCheck.status })
    }

    const currentChapter = await prisma.chapter.findFirst({
      where: { id: chapterId, projectId },
      select: { status: true },
    })

    if (!currentChapter) {
      return new NextResponse('找不到章節', { status: 404 })
    }

    const body = await request.json()
    const { title, content, saveVersion, commitMsg, status } = body
    const isFirstPublish = status === 'PUBLISHED' && currentChapter.status !== 'PUBLISHED'

    const dbOperations: any[] = [
      prisma.chapter.update({
        where: { id: chapterId },
        data: {
          title: title,
          content: content,
          ...(status && { status }),
          ...(isFirstPublish && { publishedAt: new Date() })
        }
      })
    ];

    // 判斷是否需要建立版本紀錄
    if (saveVersion) {
      dbOperations.push(
        prisma.checkpoint.create({
          data: {
            projectId: projectId,
            authorId: authCheck.userId,
            targetType: "CHAPTER",
            targetId: chapterId,
            content: content as any, 
            commitMsg: commitMsg || "編輯器存檔"
          }
        })
      );

      // 手動存檔時發送協作通知
      const [project, actor, members] = await Promise.all([
        prisma.project.findUnique({ where: { id: projectId }, select: { title: true, ownerId: true } }),
        prisma.user.findUnique({ where: { id: authCheck.userId }, select: { name: true } }),
        prisma.projectMember.findMany({ where: { projectId: projectId }, select: { userId: true } })
      ]);

      const projectName = project?.title || '未知專案';
      const actorName = actor?.name || '成員';
      
      const recipientIds = new Set(members.map(m => m.userId));
      if (project?.ownerId) recipientIds.add(project.ownerId);
      recipientIds.delete(authCheck.userId);

      if (recipientIds.size > 0) {
        const notifications = Array.from(recipientIds).map(userId => ({
          recipientId: userId,
          actorId: authCheck.userId,
          type: 'SYSTEM' as const,
          projectId: projectId,
          targetId: chapterId,
          message: `${actorName} 為《${projectName}》的章節「${title}」儲存了新版本`,
          link: `/novel_list/${projectId}/editor/${chapterId}`
        }));

        dbOperations.push(
          prisma.notification.createMany({
            data: notifications
          })
        );
      }
    }

    if (status === 'PUBLISHED') {
      dbOperations.push(
        prisma.project.updateMany({
          where: { 
            id: projectId,
            status: 'DRAFT' 
          },
          data: { 
            status: 'SERIALIZING'
          }
        })
      );
    }

    const results = await prisma.$transaction(dbOperations)
    const updatedChapter = results[0] 

    if (status) {
      // 每次章節公開狀態改變時，都重新依最早可見章節同步作品的發布狀態與日期。
      const firstPublishedChapter = await prisma.chapter.findFirst({
        where: {
          projectId,
          status: 'PUBLISHED',
          deletedAt: null,
          publishedAt: { not: null },
        },
        orderBy: { publishedAt: 'asc' },
        select: { publishedAt: true },
      })

      if (firstPublishedChapter?.publishedAt) {
        await prisma.project.update({
          where: { id: projectId },
          data: { publishedAt: firstPublishedChapter.publishedAt },
        })
      } else {
        // 沒有任何公開章節時，作品不應繼續出現在探索大廳。
        await prisma.project.update({
          where: { id: projectId },
          data: { status: 'DRAFT', publishedAt: null },
        })
      }
    }

    return NextResponse.json(updatedChapter)
  } catch (error) {
    console.error("PUT Chapter Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
