import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: /api/projects/[projectId]/chapters/[chapterId]/versions
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; chapterId: string }> }
) {
  try {
    const { chapterId } = await params;

    // 撈出該章節的所有歷史快照，按時間倒序（最新的在最上面）
    const checkpoints = await prisma.checkpoint.findMany({
      where: {
        targetId: chapterId,
        targetType: {
          equals: 'CHAPTER',
          mode: 'insensitive'
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(checkpoints);
  } catch (error) {
    console.error('撈取版本列表失敗:', error);
    return NextResponse.json({ error: '無法獲取歷史紀錄' }, { status: 500 });
  }
}