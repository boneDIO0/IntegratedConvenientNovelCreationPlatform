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

// ✏️ 儲存：更新章節的標題與編輯器內容 (JSON)
export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string; chapterId: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session) return new NextResponse("請先登入", { status: 401 })

    const { chapterId } = await context.params
    const body = await request.json()

    const updatedChapter = await prisma.chapter.update({
      where: { id: chapterId },
      data: {
        title: body.title,
        content: body.content, // 直接存入 Tiptap 的 JSON 格式
      }
    })

    return NextResponse.json(updatedChapter)
  } catch (error) {
    console.error("PATCH Chapter Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}