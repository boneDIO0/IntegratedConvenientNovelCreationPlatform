import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyProjectAccess } from '@/lib/auth-utils';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const { chapterId, newOrderIndex } = body;

    if (!chapterId || newOrderIndex === undefined) {
      return NextResponse.json({ error: '缺少 chapterId 或 newOrderIndex' }, { status: 400 });
    }

    // OWNER 或 EDITOR 才有權限修改該專案
    const auth = await verifyProjectAccess(projectId, ['OWNER', 'EDITOR']);
    if (!auth.isAuthorized) {
      return NextResponse.json({ error: auth.error || '權限不足' }, { status: auth.status });
    }

    const updatedChapter = await prisma.chapter.update({
      where: { 
        id: chapterId,
        projectId: projectId 
      },
      data: { 
        orderIndex: newOrderIndex 
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: '排序更新成功',
      chapter: {
        id: updatedChapter.id,
        orderIndex: updatedChapter.orderIndex
      }
    }, { status: 200 });

  } catch (error) {
    console.error('章節排序更新失敗:', error);
    return NextResponse.json({ error: '伺服器發生錯誤' }, { status: 500 });
  }
}