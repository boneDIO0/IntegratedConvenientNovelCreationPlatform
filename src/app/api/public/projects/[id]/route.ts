import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 🌟 記取之前的教訓：確實 await params，並對應資料夾名稱 id
    const { id } = await context.params

    const publicProject = await prisma.project.findFirst({
      where: {
        id: id,
        // 確保這本書不是未公開的草稿，且沒被刪除
        status: { in: ['SERIALIZING', 'COMPLETED'] },
        deletedAt: null
      },
      include: {
        // 帶出作者的基本資料
        owner: {
          select: { name: true, image: true }
        },
        // 📍 核心防護區：章節列表必須嚴格過濾
        chapters: {
          where: { 
            status: 'PUBLISHED' // 絕對只抓取已發布的章節
          },
          select: {
            id: true,
            title: true,
            publishedAt: true, // 讀者會想知道這章是什麼時候更新的
          },
          orderBy: {
            createdAt: 'asc' // 依照創建時間由舊到新排序 (第一章在最上面)
          }
        }
      }
    })

    if (!publicProject) {
      return new NextResponse("找不到該部公開作品", { status: 404 })
    }

    return NextResponse.json(publicProject)

  } catch (error) {
    console.error("Public Project Detail GET Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}