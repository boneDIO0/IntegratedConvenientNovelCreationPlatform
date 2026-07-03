import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyProjectAccess } from '@/lib/auth-utils'
import { PROJECT_ROLES } from '@/lib/roles'

// 📥 讀取：撈出這個章節的標題與內容
export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string; chapterId: string }> }
) {
  try {
    // 🌟 記取教訓：一定要加 await
    const { projectId, chapterId } = await context.params

    // 🛡️ RBAC 防禦：所有專案成員 (OWNER, EDITOR, VIEWER) 皆可讀取
    const authCheck = await verifyProjectAccess(projectId, [
      PROJECT_ROLES.OWNER,
      PROJECT_ROLES.EDITOR,
      PROJECT_ROLES.VIEWER
    ])

    if (!authCheck.isAuthorized) {
      return new NextResponse(authCheck.error, { status: authCheck.status })
    }

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId }
    })

    if (!chapter) return new NextResponse("找不到章節", { status: 404 })

    return NextResponse.json(chapter)
  } catch (error) {
    console.error("GET Chapter Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

// ✏️ 儲存：更新章節的標題與編輯器內容，並同時建立 Checkpoint 歷史紀錄
// 🌟 修正 1：將 PATCH 改為 PUT，與前端 Editor.tsx 保持一致
export async function PUT(
  request: Request,
  context: { params: Promise<{ projectId: string; chapterId: string }> }
) {
  try {
    const { projectId, chapterId } = await context.params

    // 🛡️ RBAC 邊界防禦：只有 OWNER 和 EDITOR 可以修改章節
    const authCheck = await verifyProjectAccess(projectId, [
      PROJECT_ROLES.OWNER,
      PROJECT_ROLES.EDITOR
    ])

    if (!authCheck.isAuthorized || !authCheck.userId) {
      return new NextResponse(authCheck.error, { status: authCheck.status })
    }

    const body = await request.json()

    // 🌟 核心修改：使用 Prisma Transaction，確保「更新」與「備份」同時成功
    const [updatedChapter, newCheckpoint] = await prisma.$transaction([

      // 動作 1：更新目前的章節內容
      prisma.chapter.update({
        where: { id: chapterId },
        data: {
          title: body.title,
          content: body.content,
        }
      }),

      // 動作 2：同步生出一份 Checkpoint 快照留底
      prisma.checkpoint.create({
        data: {
          // 🌟 修正 2：確保欄位型態能正確與 PostgreSQL @db.Uuid 對接
          projectId: projectId,
          authorId: authCheck.userId,
          targetType: "CHAPTER", // 建議改用大寫，與你版本獲取 API 的 CHAPTER 一致
          targetId: chapterId,
          content: body.content as any, // 強制斷言符合 Prisma Json 型態
          commitMsg: body.commitMsg || "編輯器手動存檔" // 🌟 修正 3：改用前端傳進來的自訂備註（例如：第幾章 - 手動存檔點）
        }
      })

    ])

    return NextResponse.json(updatedChapter)
  } catch (error) {
    console.error("PUT Chapter & Checkpoint Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}