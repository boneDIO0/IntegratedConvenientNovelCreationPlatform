import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { put } from '@vercel/blob'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client' // 🌟 核心修正 1：引入 Prisma 命名空間以使用型別
import { authOptions } from '@/lib/auth/config' // 🌟 優化點：帶入你們專案的 authOptions 配置

// 讀取：撈出目前使用者的所有「小說 (Project)」
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: "找不到使用者" }, { status: 404 })

    // 🌟 核心修正：直接從 Project 表撈取，包容新舊資料架構
    const projects = await prisma.project.findMany({
      where: {
        deletedAt: null, // 沒被刪除的
        OR: [
          { ownerId: user.id }, // 條件 A：我是擁有者 (涵蓋舊版資料)
          { members: { some: { userId: user.id } } } // 條件 B：我是協作成員 (涵蓋新版資料)
        ]
      },
      include: {
        // 順便把成員角色拉出來，供前端顯示使用
        members: {
          where: { userId: user.id },
          select: { role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // 整理資料格式，讓前端依然可以拿到正確的 role (如果沒有 member 紀錄但 owner 是自己，就預設為 owner)
    const formattedProjects = projects.map(p => ({
      ...p,
      role: p.ownerId === user.id ? 'owner' : (p.members[0]?.role || 'member')
    }));

    return NextResponse.json(formattedProjects)
  } catch (error) {
    console.error("GET Projects Error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" }, 
      { status: 500 }
    )
  }
}


// 📤 新增：建立一本新的「小說 (Project)」
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    // 透過 email 撈出資料庫中真實的 user 資料 (為了安全拿到正確的 id)
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return NextResponse.json({ error: '找不到使用者' }, { status: 404 })
    }

    // 解析 FormData
    const formData = await request.formData()
    const title = formData.get('title') as string
    const coverFile = formData.get('cover') as File | null

    if (!title) {
      return NextResponse.json({ error: '缺少小說標題' }, { status: 400 })
    }

    let coverUrl = null

    // 若有上傳圖片，則存入 Vercel Blob
    if (coverFile) {
      const blob = await put(coverFile.name, coverFile, {
        access: 'public',
        addRandomSuffix: true,
      })
      coverUrl = blob.url
    }

    // 在資料庫中創建一個新 Project，結合 Transaction 與你上傳的表單資料
    const newProject = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const project = await tx.project.create({
        data: {
          title: title,       
          coverUrl: coverUrl, 
          ownerId: user.id, 
          members: {
            create: {
              userId: user.id,
              role: 'owner'
            }
          }
        }
      })
      
      return project
    })

    return NextResponse.json(newProject, { status: 201 })
  } catch (error) {
    console.error('建立專案失敗:', error)
    return NextResponse.json({ error: '伺服器發生錯誤' }, { status: 500 })
  }
}