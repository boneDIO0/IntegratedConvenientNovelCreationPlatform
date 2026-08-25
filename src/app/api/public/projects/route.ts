import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'

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

export async function GET(request: Request) {
  try {
    const { page, limit } = getPaginationParams(request)
    const where: Prisma.ProjectWhereInput = {
      status: {
        in: ['SERIALIZING', 'COMPLETED'],
      },
      deletedAt: null,
      // 即使舊資料的作品狀態尚未同步，只要沒有公開章節就不應曝光。
      chapters: {
        some: {
          status: 'PUBLISHED',
          deletedAt: null,
        },
      },
    }

    const getPublicProjects = (targetPage: number) => prisma.project.findMany({
      where,
      select: {
        id: true,
        title: true,
        createdAt: true,
        publishedAt: true,
        coverUrl: true,
        description: true,
        status: true,
        owner: {
          select: {
            name: true,
            image: true,
          },
        },
        chapters: {
          where: {
            status: 'PUBLISHED',
            deletedAt: null,
            publishedAt: { not: null },
          },
          orderBy: { publishedAt: 'asc' },
          select: { publishedAt: true },
          take: 1,
        },
      },
      orderBy: { publishedAt: 'desc' },
      skip: (targetPage - 1) * limit,
      take: limit,
    })

    // 計算總頁數與讀取卡片彼此獨立，因此同時執行以避免兩次資料庫等待相加。
    const [total, requestedPageProjects] = await Promise.all([
      prisma.project.count({ where }),
      getPublicProjects(page),
    ])
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const currentPage = Math.min(page, totalPages)
    const publicProjects = currentPage === page
      ? requestedPageProjects
      : await getPublicProjects(currentPage)

    const projectsWithFirstChapterDate = publicProjects
      .map(({ chapters, ...project }) => ({
        ...project,
        publishedAt: chapters[0]?.publishedAt ?? null,
      }))

    return NextResponse.json({
      items: projectsWithFirstChapterDate,
      pagination: {
        page: currentPage,
        limit,
        total,
        totalPages,
      },
    })

  } catch (error) {
    console.error("Public Projects GET Error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" }, 
      { status: 500 }
    )
  }
}
