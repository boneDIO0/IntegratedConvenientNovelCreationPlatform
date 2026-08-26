import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const where: Prisma.ProjectWhereInput = {
      status: {
        in: ['SERIALIZING', 'COMPLETED'],
      },
      deletedAt: null,
      chapters: {
        some: {
          status: 'PUBLISHED',
          deletedAt: null,
        },
      },
    }

    const projects = await prisma.project.findMany({
      where,
      select: { tags: true },
    })

    const tags = [...new Set(
      projects.flatMap((project) =>
        project.tags.map((tag) => tag.trim()).filter(Boolean)
      )
    )].sort((left, right) => left.localeCompare(right, 'zh-Hant'))

    return NextResponse.json({ items: tags })
  } catch (error) {
    console.error('Public Tags GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
