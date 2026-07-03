import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import prisma from '@/lib/prisma' 
import { authOptions } from '@/lib/auth/config' // 🌟 補上優化點：建議帶入你的 authOptions
import { verifyProjectAccess } from '@/lib/auth-utils'
import { PROJECT_ROLES } from '@/lib/roles'

// 💡 1. 全面定義 Next.js 16 標準路由上下文（Context）型別
interface RouteContext {
  params: Promise<{
    projectId: string;
  }>;
}

// 📥 讀取：撈出這本小說所有的「章節」
export async function GET(
  request: NextRequest, // 💡 2. 建議改用標準 NextRequest
  context: RouteContext // 💡 3. 核心修正：正式將 params 宣告為 Promise 上下文
) {
  try {
    // 💡 4. 優化點：傳入專案的 authOptions，防範 getServerSession 讀不到使用者 token
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "請先登入" }, { status: 401 })

    // 💡 5. 核心動作：完美對齊 Next.js 16 異步拆解
    const { projectId } = await context.params

    const authCheck = await verifyProjectAccess(projectId, [
      PROJECT_ROLES.OWNER,
      PROJECT_ROLES.EDITOR,
      PROJECT_ROLES.VIEWER
    ])

    if (!authCheck.isAuthorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    // 1. 取得小說標題
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { title: true }
    })

    if (!project) return NextResponse.json({ error: "找不到該作品" }, { status: 404 })

    // 2. 撈出章節列表，按 orderIndex 排序
    const chapters = await prisma.chapter.findMany({
      where: { projectId: projectId, deletedAt: null },
      orderBy: { orderIndex: 'asc' }
    })

    // 回傳小說標題與章節列表
    return NextResponse.json({ novelTitle: project.title, chapters })
  } catch (error) {
    console.error("GET Chapters Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

// 📤 新增：為這本小說建立一個「新章節」
export async function POST(
  request: NextRequest,
  context: RouteContext // 💡 同步對齊 Next.js 16 異步參數規格
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "請先登入" }, { status: 401 })

    // 💡 同步對齊異步拆解
    const { projectId } = await context.params

    const authCheck = await verifyProjectAccess(projectId, [
      PROJECT_ROLES.OWNER,
      PROJECT_ROLES.EDITOR
    ])

    if (!authCheck.isAuthorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    // 1. 計算目前的章節數，用來設定標題和排序
    const count = await prisma.chapter.count({
      where: { projectId: projectId }
    })

    // 2. 建立新章節
    const newChapter = await prisma.chapter.create({
      data: {
        projectId: projectId,
        title: `第 ${count + 1} 章：未命名`,
        orderIndex: count + 1,
        content: {}, // 初始內容為空 JSON
      }
    })

    return NextResponse.json(newChapter)
  } catch (error) {
    console.error("POST Chapter Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}