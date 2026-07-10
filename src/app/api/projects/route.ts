import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { put } from '@vercel/blob'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client' // 🌟 核心修正 1：引入 Prisma 命名空間以使用型別
import { authOptions } from '@/lib/auth/config' // 🌟 優化點：帶入你們專案的 authOptions 配置

// 讀取：撈出目前使用者的所有「小說 (Project)」
export async function GET() {
  try {
    // 🌟 優化點：傳入 authOptions，確保在雲端能正確解析完整的 session 資訊
    const session = await getServerSession(authOptions)
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
    // 📍 修正：把 new NextResponse 純文字，改成 NextResponse.json
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
          ownerId: user.id 
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