import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import prisma from '@/lib/prisma'

// ✏️ 修改：更新小說標題
export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session) return new NextResponse("請先登入", { status: 401 })

    const { projectId } = await context.params
    const body = await request.json()

    // 呼叫資料庫更新標題
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { title: body.title }
    })

    return NextResponse.json(updatedProject)
  } catch (error) {
    console.error("PATCH Project Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
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