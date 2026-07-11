import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    // 撈出所有允許公開的小說
    const publicProjects = await prisma.project.findMany({
      where: {
        // 📍 核心過濾：只抓連載中或已完結的，排除 DRAFT (未公開)
        status: {
          in: ['SERIALIZING', 'COMPLETED']
        },
        // 排除掉已經被丟進垃圾桶的
        deletedAt: null 
      },
      // 📍 關聯抓取：把作者 (owner) 的基本資訊一起帶出來給大廳顯示
      include: {
        owner: {
          select: {
            name: true,
            image: true, 
          }
        }
      },
      // 排序：預設先用建立時間由新到舊排 (未來你可以改成用 viewCount 或 publishedAt 排)
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(publicProjects)

  } catch (error) {
    console.error("Public Projects GET Error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" }, 
      { status: 500 }
    )
  }
}