import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyProjectAccess } from '@/lib/auth-utils';
import { PROJECT_ROLES } from '@/lib/roles';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

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
    if (!auth.isAuthorized || !auth.userId) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const currentUserId = auth.userId;
    const body = await request.json();
    const incomingTimestamp = body.timestamp;
    
    if (!incomingTimestamp) {
      return NextResponse.json({ error: '缺少時間戳記參數' }, { status: 400 });
    }    

    const content = (entity.content as any) || {};
    const versions = Array.isArray(content.versions) ? content.versions : [];

    const targetVersion = versions.find((v: any) => String(v.timestamp || v.id) === String(incomingTimestamp));

    if (!targetVersion || !targetVersion.content) {
      return NextResponse.json({ error: '還原失敗：找不到符合的版本快照' }, { status: 422 });
    }

    const { versions: _, ...pureSnapshotData } = targetVersion.content;

    const restoredContent = {
      ...pureSnapshotData,
      versions: versions
    };

    const updatedEntity = await prisma.noteEntity.update({
      where: { id },
      data: {
        title: targetVersion.name || entity.title, 
        content: JSON.parse(JSON.stringify(restoredContent)), 
        updatedAt: new Date()
      }
    });

    const [project, actor, members] = await Promise.all([
      prisma.project.findUnique({ where: { id: entity.projectId }, select: { title: true, ownerId: true } }),
      prisma.user.findUnique({ where: { id: currentUserId }, select: { name: true } }),
      prisma.projectMember.findMany({ where: { projectId: entity.projectId }, select: { userId: true } })
    ]);

    const projectName = project?.title || '未知專案';
    const actorName = actor?.name || '某人';
    const noteName = updatedEntity.title || '未知筆記';
    const versionDisplayName = targetVersion.versionName || targetVersion.name || new Date(Number(incomingTimestamp)).toLocaleString();

    const recipientIds = new Set(members.map(m => m.userId));
    if (project?.ownerId) recipientIds.add(project.ownerId);
    recipientIds.delete(currentUserId);

    if (recipientIds.size > 0) {
      const notifications = Array.from(recipientIds).map(userId => ({
        recipientId: userId,
        actorId: currentUserId,
        type: 'SYSTEM' as const,
        projectId: entity.projectId,
        targetId: id,
        message: `⚠️ ${actorName} 將《${projectName}》的筆記大綱「${noteName}」還原至歷史版本：「${versionDisplayName}」`,
        link: `/novel_list/${entity.projectId}/notes` 
      }));

      await prisma.notification.createMany({ data: notifications });
    }

    console.log(`🎉 [還原後端] 筆記大綱「${updatedEntity.title}」已安全還原成功！`);
    return NextResponse.json(updatedEntity, { status: 200 });

  } catch (error) {
    console.error('🔴 還原後端崩潰:', error);
    return NextResponse.json({ error: '伺服器內部還原程序異常' }, { status: 500 });
  }
}