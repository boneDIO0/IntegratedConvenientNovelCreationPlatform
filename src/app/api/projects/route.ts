import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import prisma from '@/lib/prisma'

// 讀取：撈出目前使用者的所有「小說 (Project)」
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session || !session.user?.email) {
      return new NextResponse("請先登入", { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return new NextResponse("找不到使用者", { status: 404 })

    // 撈出屬於這個人的 Project (過濾掉已刪除的)，按建立時間排序
    const projects = await prisma.project.findMany({
      where: { 
        ownerId: user.id,
        deletedAt: null 
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error("GET Projects Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

// 📤 新增：建立一本新的「小說 (Project)」
export async function POST() {
  try {
    const session = await getServerSession()
    if (!session || !session.user?.email) {
      return new NextResponse("請先登入", { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return new NextResponse("找不到使用者", { status: 404 })

    // 在資料庫中創建一個新 Project
    const newProject = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          title: '未命名的作品',
          ownerId: user.id
        }
      })

      await tx.projectMember.create({
        data: {
          projectId: project.id,
          userId: user.id,
          role: 'owner'
        }
      })

      return project
    })

    return NextResponse.json(newProject)
  } catch (error) {
    console.error("POST Project Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}