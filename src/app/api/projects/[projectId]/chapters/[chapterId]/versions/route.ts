import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/prisma';

// GET: /api/projects/[projectId]/chapters/[chapterId]/versions
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; chapterId: string }> }
) {
  try {
    const { projectId, chapterId } = await params;

    // 驗證登入狀態
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: '請先登入系統' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: '找不到該使用者' }, { status: 404 });

    // 🌟 修正點：同時檢查「是否為作者本人(ownerId)」或是「是否為協作成員」
    const hasAccess = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: user.id }, // 條件 A：作者本人 (兼容舊資料)
          { members: { some: { userId: user.id } } } // 條件 B：專案成員 (新機制)
        ]
      }
    });

    if (!hasAccess) {
      return NextResponse.json({ error: '您不屬於此專案，無權檢視歷史紀錄' }, { status: 403 });
    }
    
    // 撈出該章節的所有歷史快照，按時間倒序（最新的在最上面）
    const checkpoints = await prisma.checkpoint.findMany({
      where: {
        targetId: chapterId,
        targetType: {
          equals: 'CHAPTER',
          mode: 'insensitive'
        }
      },
      include: {
        author: {
          select: { name: true, image: true }
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