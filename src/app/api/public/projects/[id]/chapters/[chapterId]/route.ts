import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { id, chapterId } = await context.params

    const chapter = await prisma.chapter.findFirst({
      where: {
        id: chapterId,
        projectId: id,
        // 📍 核心防護：絕對只吐出已發布的章節
        status: 'PUBLISHED', 
        // 確保這本書不是未公開的草稿
        project: {
          status: { in: ['SERIALIZING', 'COMPLETED'] },
          deletedAt: null
        }
      },
      select: {
        title: true,
        content: true,
        publishedAt: true,
        // 帶出外層小說的標題，給前端做返回按鈕用
        project: {
          select: {
            title: true
          }
        }
      }
    })

    if (!chapter) {
      return new NextResponse("找不到該章節或尚未公開", { status: 404 })
    }

    return NextResponse.json(chapter)

  } catch (error) {
    console.error("Public Chapter GET Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}