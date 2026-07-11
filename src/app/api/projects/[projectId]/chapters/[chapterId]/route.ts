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

    // 📍 建立一個「資料庫操作陣列」，把要同時執行的任務放進來
    const dbOperations: any[] = [
      // 動作 1：更新目前的章節內容與發布狀態
      prisma.chapter.update({
        where: { id: chapterId },
        data: {
          title: title,
          content: content,
          ...(status && { status }),
          ...(status === 'PUBLISHED' && { publishedAt: new Date() }) 
        }
      }),

      // 動作 2：同步生出一份 Checkpoint 快照留底
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
    ];

    // 📍 動作 3 (新增)：如果是發布操作，自動將整本小說升級為「連載中」
    if (status === 'PUBLISHED') {
      dbOperations.push(
        prisma.project.updateMany({
          where: { 
            id: projectId,
            status: 'DRAFT' // 只有當小說目前是「未公開 (DRAFT)」時，才幫它自動升級
          },
          data: { 
            status: 'SERIALIZING' 
          }
        })
      );
    }

    // 將所有任務一起丟給資料庫執行，確保它們「要嘛全成功，要嘛全失敗」
    const results = await prisma.$transaction(dbOperations)
    
    // results[0] 就是我們在陣列裡放的第一個任務 (chapter.update) 的回傳值
    const updatedChapter = results[0] 

    return NextResponse.json(updatedChapter)
  } catch (error) {
    console.error("PUT Chapter & Checkpoint Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}