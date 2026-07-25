import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyProjectAccess } from '@/lib/auth-utils'
import { PROJECT_ROLES } from '@/lib/roles'

// 📥 讀取：撈出這個章節的標題與內容
export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string; chapterId: string }> } // 📍 修正：完全對應資料夾名稱 [projectId]
) {
  try {
    const { projectId, chapterId } = await context.params // 📍 正確解構出 projectId

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
      'OWNER',
      'EDITOR'
    ])

    if (!authCheck.isAuthorized || !authCheck.userId) {
      return new NextResponse(authCheck.error, { status: authCheck.status })
    }

    const body = await request.json()
    const { title, content, saveVersion, commitMsg, status } = body

    // 📍 建立一個「資料庫操作陣列」，先放入一定會執行的更新章節動作
    const dbOperations: any[] = [
      prisma.chapter.update({
        where: { id: chapterId },
        data: {
          title: title,
          content: content,
          ...(status && { status }),
          ...(status === 'PUBLISHED' && { publishedAt: new Date() }) 
        }
      })
    ];

    // 📍 核心修改：判斷是否需要建立版本紀錄（自動存檔為 false，手動存檔為 true）
    if (saveVersion) {
      dbOperations.push(
        prisma.checkpoint.create({
          data: {
            projectId: projectId,
            authorId: authCheck.userId,
            targetType: "CHAPTER",
            targetId: chapterId,
            content: content as any, 
            commitMsg: commitMsg || "編輯器手動存檔"
          }
        })
      );
    }

    // 動作 3：如果是發布操作，自動將整本小說升級為「連載中」
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

    // 將所有任務一起丟給資料庫執行
    const results = await prisma.$transaction(dbOperations)
    const updatedChapter = results[0] 

    return NextResponse.json(updatedChapter)
  } catch (error) {
    console.error("PUT Chapter Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}