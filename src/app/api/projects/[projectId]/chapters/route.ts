import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import prisma from '@/lib/prisma' // 使用組員的 prisma 連線檔

// 📥 讀取：撈出這本小說所有的「章節」
export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getServerSession()
    if (!session) return new NextResponse("請先登入", { status: 401 })

    const { projectId } = await params

    // 1. 先確認這本小說是不是這個人的（安全檢查）
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true, title: true }
    })

    if (!project) return new NextResponse("找不到該作品", { status: 404 })

    // 2. 撈出章節列表，按 orderIndex 排序
    const chapters = await prisma.chapter.findMany({
      where: { projectId: projectId, deletedAt: null },
      orderBy: { orderIndex: 'asc' }
    })

    // 回傳小說標題與章節列表
    return NextResponse.json({ novelTitle: project.title, chapters })
  } catch (error) {
    console.error("GET Chapters Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

// 📤 新增：為這本小說建立一個「新章節」
export async function POST(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getServerSession()
    if (!session) return new NextResponse("請先登入", { status: 401 })

    const { projectId } = await params

    // 1. 計算目前的章節數，用來設定標題和排序
    const count = await prisma.chapter.count({
      where: { projectId: projectId }
    })

    // 2. 建立新章節
    const newChapter = await prisma.chapter.create({
      data: {
        projectId: projectId,
        title: `第 ${count + 1} 章：未命名`,
        orderIndex: count + 1,
        content: {}, // 初始內容為空 JSON
      }
    })

    return NextResponse.json(newChapter)
  } catch (error) {
    console.error("POST Chapter Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}