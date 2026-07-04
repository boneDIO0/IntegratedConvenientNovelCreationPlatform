import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { put } from '@vercel/blob'
import prisma from '@/lib/prisma'

// 🌟 核心修正 1：全面升級 PATCH 規格，將 params 改為 Promise，並統一變數名稱為 projectId
export async function PATCH(
  request: NextRequest, // 建議改用 NextRequest 與 Next.js 最佳實踐對齊
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    // 🌟 核心修正 2：用 await 解開非同步的 params，拿到對齊資料夾命名的 projectId
    const { projectId } = await context.params

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: '找不到使用者' }, { status: 404 })

    // 1. 解析 FormData，支援封面圖片上傳
    const formData = await request.formData()
    const title = formData.get('title') as string
    const coverFile = formData.get('cover') as File | null

    if (!title) {
      return NextResponse.json({ error: '標題不能為空' }, { status: 400 })
    }

    // 準備要更新的資料物件
    const updateData: { title: string; coverUrl?: string } = { title }

    // 2. 如果有上傳「新」封面，就存入 Vercel Blob 並更新網址
    if (coverFile && coverFile.size > 0) { // 加上 size > 0 防止傳入空物件檔案
      const blob = await put(coverFile.name, coverFile, {
        access: 'public',
      })
      updateData.coverUrl = blob.url
    }

    // 3. 寫入資料庫
    const updatedProject = await prisma.project.update({
      where: { 
        id: projectId,    // 🌟 核心修正 3：將原本的 params.id 修正為 projectId
        ownerId: user.id  // 確保只能修改自己的作品，這點權限防禦寫得很棒！
      },
      data: updateData
    })

    return NextResponse.json(updatedProject)
  } catch (error) {
    console.error('修改專案失敗:', error)
    return NextResponse.json({ error: '伺服器發生錯誤' }, { status: 500 })
  }
}

// 🗑️ 刪除：把小說丟進垃圾桶 (軟刪除)
export async function DELETE(
  request: NextRequest, // 統一改用 NextRequest 型別
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const { projectId } = await context.params
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return new NextResponse("找不到使用者", { status: 404 })

    // 這裡用「軟刪除」，也就是打上 deletedAt 的時間戳記，而不是直接從資料庫抹除
    const result = await prisma.project.updateMany({
      where: { id: projectId, ownerId: user.id },
      data: { deletedAt: new Date() }
    })

    if (result.count === 0) {
      return new NextResponse("沒有權限刪除或專案不存在", { status: 403 })
    }

    return new NextResponse("刪除成功", { status: 200 })
  } catch (error) {
    console.error("DELETE Project Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}