import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyProjectAccess } from '@/lib/auth-utils';
import { PROJECT_ROLES } from '@/lib/roles';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const entity = await prisma.settingEntity.findUnique({
      where: { id }
    });

    if (!entity) {
      return NextResponse.json({ error: '找不到該設定項目' }, { status: 404 });
    }

    // 僅限擁有者與編輯者可以還原設定
    const auth = await verifyProjectAccess(entity.projectId, [
      PROJECT_ROLES.OWNER,
      PROJECT_ROLES.EDITOR
    ]);
    if (!auth.isAuthorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();

    const incomingTimestamp = body.timestamp;
    if (!incomingTimestamp) {
      return NextResponse.json({ error: '缺少時間戳記參數' }, { status: 400 });
    }    

    const content = (entity.content as any) || {};
    const versions = Array.isArray(content.versions) ? content.versions : [];

    // 1. 全字串安全比對
    const targetVersion = versions.find((v: any) => String(v.timestamp || v.id) === String(incomingTimestamp));

    if (!targetVersion || !targetVersion.content) {
      return NextResponse.json({ error: '還原失敗：找不到符合的版本快照' }, { status: 422 });
    }

    // 💡 關鍵修正：確保提取出來的快照是純粹的表單欄位，絕不夾帶舊的 versions
    const { versions: _, ...pureSnapshotData } = targetVersion.content;

    // 2. 打包要還原的完整 JSON 欄位（主體變回過去，但珍貴的時光機歷史鏈必須保留）
    const restoredContent = {
      ...pureSnapshotData,
      versions: versions
    };

    // 3. 🚀【雙管齊下修正】：同時更新外層的 title 與內部的 content！
    const updatedEntity = await prisma.settingEntity.update({
      where: { id },
      data: {
        title: targetVersion.name || entity.title, // 🌟 讓標題同步回歸當時的版本名稱！
        content: JSON.parse(JSON.stringify(restoredContent)), // 徹底純化 JSON
        updatedAt: new Date()
      }
    });

    console.log(`🎉 [還原後端] 項目「${updatedEntity.title}」已安全還原成功！`);
    return NextResponse.json(updatedEntity, { status: 200 });

  } catch (error) {
    console.error('🔴 還原後端崩潰:', error);
    return NextResponse.json({ error: '伺服器內部還原程序異常' }, { status: 500 });
  }
}