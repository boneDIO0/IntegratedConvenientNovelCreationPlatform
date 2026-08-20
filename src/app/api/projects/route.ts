import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { put } from '@vercel/blob'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client' // 🌟 核心修正 1：引入 Prisma 命名空間以使用型別
import { authOptions } from '@/lib/auth/config' // 🌟 優化點：帶入你們專案的 authOptions 配置

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 20

function getPaginationParams(request: Request) {
  const { searchParams } = new URL(request.url)
  const requestedPage = Number.parseInt(searchParams.get('page') ?? '1', 10)
  const requestedLimit = Number.parseInt(searchParams.get('limit') ?? String(DEFAULT_PAGE_SIZE), 10)

  return {
    page: Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    limit: Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE,
  }
}

// 讀取：撈出目前使用者的所有「小說 (Project)」
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: "找不到使用者" }, { status: 404 })

    const { page, limit } = getPaginationParams(request)
    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
      OR: [
        { ownerId: user.id },
        { members: { some: { userId: user.id } } },
      ],
    }

    // 僅回傳卡片會使用的欄位，避免傳送設定集等大型 JSON 資料。
    const getProjects = (targetPage: number) => prisma.project.findMany({
      where,
      select: {
        id: true,
        ownerId: true,
        title: true,
        description: true,
        coverUrl: true,
        status: true,
        createdAt: true,
        members: {
          where: { userId: user.id },
          select: { role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (targetPage - 1) * limit,
      take: limit,
    })

    // 同時計算總頁數與讀取目前頁資料，減少一次遠端資料庫等待。
    const [total, requestedPageProjects] = await Promise.all([
      prisma.project.count({ where }),
      getProjects(page),
    ])
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const currentPage = Math.min(page, totalPages)
    const projects = currentPage === page
      ? requestedPageProjects
      : await getProjects(currentPage)
    
    // 整理資料格式，讓前端依然可以拿到正確的 role (如果沒有 member 紀錄但 owner 是自己，就預設為 owner)
    const formattedProjects = projects.map(({ members, ownerId, ...project }) => ({
      ...project,
      role: ownerId === user.id ? 'owner' : (members[0]?.role || 'member'),
    }))

    return NextResponse.json({
      items: formattedProjects,
      pagination: {
        page: currentPage,
        limit,
        total,
        totalPages,
      },
    })
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
    const description = (formData.get('description') as string | null)?.trim() || null
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
          description: description,       
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
