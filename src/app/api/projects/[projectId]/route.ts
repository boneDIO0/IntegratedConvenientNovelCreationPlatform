import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { put } from '@vercel/blob'
import prisma from '@/lib/prisma'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: '找不到使用者' }, { status: 404 })

    // 1. 改成解析 FormData，以支援圖片上傳
    const formData = await request.formData()
    const title = formData.get('title') as string
    const coverFile = formData.get('cover') as File | null

    if (!title) {
      return NextResponse.json({ error: '標題不能為空' }, { status: 400 })
    }

    // 準備要更新的資料物件
    const updateData: { title: string; coverUrl?: string } = { title }

    // 2. 如果有上傳「新」封面，就存入 Vercel Blob 並更新網址
    if (coverFile) {
      const blob = await put(coverFile.name, coverFile, {
        access: 'public',
      })
      updateData.coverUrl = blob.url
    }

    // 3. 寫入資料庫
    const updatedProject = await prisma.project.update({
      where: { 
        id: params.id,
        ownerId: user.id // 確保只能修改自己的作品
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
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session) return new NextResponse("請先登入", { status: 401 })

    const { projectId } = await context.params

    // 這裡我們用「軟刪除」，也就是打上 deletedAt 的時間戳記，而不是直接從資料庫抹除
    await prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date() }
    })

    return new NextResponse("刪除成功", { status: 200 })
  } catch (error) {
    console.error("DELETE Project Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}