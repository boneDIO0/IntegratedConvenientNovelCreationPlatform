import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import prisma from '@/lib/prisma'

// 📥 讀取：撈出這個章節的標題與內容
export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string; chapterId: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session) return new NextResponse("請先登入", { status: 401 })

    // 🌟 記取教訓：一定要加 await
    const { chapterId } = await context.params

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

/// ✏️ 儲存：更新章節的標題與編輯器內容，並同時建立 Checkpoint 歷史紀錄
export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string; chapterId: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session || !session.user?.email) return new NextResponse("請先登入", { status: 401 })

    // 🌟 先透過 email 找出這位作者的真實 UUID (因為 Checkpoint 需要 authorId)
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    if (!currentUser) return new NextResponse("找不到使用者", { status: 404 })

    const { projectId, chapterId } = await context.params
    const body = await request.json()

    // 🌟 核心修改：使用 Prisma Transaction，確保「更新」與「備份」同時成功
    const [updatedChapter, newCheckpoint] = await prisma.$transaction([
      
      // 動作 1：更新目前的章節內容
      prisma.chapter.update({
        where: { id: chapterId },
        data: {
          title: body.title,
          content: body.content, 
        }
      }),

      // 動作 2：同步生出一份 Checkpoint 快照留底
      prisma.checkpoint.create({
        data: {
          projectId: projectId,
          authorId: currentUser.id,
          targetType: "chapter", // 標明這是章節的備份
          targetId: chapterId,   // 記錄是哪一個章節
          content: body.content, // 直接塞入我們剛改好 schema 的完整 JSON 內容
          commitMsg: "編輯器手動存檔" // 給個預設的備註訊息
        }
      })
      
    ])

    return NextResponse.json(updatedChapter)
  } catch (error) {
    console.error("PATCH Chapter & Checkpoint Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}