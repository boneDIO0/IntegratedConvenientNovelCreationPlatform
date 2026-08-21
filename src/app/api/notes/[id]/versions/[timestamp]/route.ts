import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyProjectAccess } from '@/lib/auth-utils';
import { PROJECT_ROLES } from '@/lib/roles';

interface VersionParams {
  params: Promise<{ id: string; timestamp: string }>;
}

export async function DELETE(request: Request, { params }: VersionParams) {
  try {
    const { id, timestamp } = await params;
    const ts = parseInt(timestamp);

    const entity = await prisma.noteEntity.findUnique({
      where: { id }
    });

    if (!entity) {
      return NextResponse.json({ error: '找不到該筆記項目' }, { status: 404 });
    }

    const auth = await verifyProjectAccess(entity.projectId, [
      PROJECT_ROLES.OWNER,
      PROJECT_ROLES.EDITOR
    ]);
    if (!auth.isAuthorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const content = (entity.content as any) || {};
    if (!content.versions || !Array.isArray(content.versions)) {
      return NextResponse.json({ error: '該項目沒有任何歷史版本' }, { status: 404 });
    }

    // 過濾掉要刪除的那個時間戳記版本
    const filteredVersions = content.versions.filter((v: any) => v.timestamp !== ts);

    if (filteredVersions.length === content.versions.length) {
      return NextResponse.json({ error: '找不到指定的歷史版本' }, { status: 404 });
    }

    // 更新回資料庫
    await prisma.noteEntity.update({
      where: { id },
      data: {
        content: {
          ...content,
          versions: filteredVersions
        }
      }
    });

    return NextResponse.json({ success: true, message: '歷史紀錄已成功抹除' }, { status: 200 });
  } catch (error) {
    console.error(`刪除版本錯誤:`, error);
    return NextResponse.json({ error: '無法刪除該歷史版本' }, { status: 500 });
  }
}