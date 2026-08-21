import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateEmbedding, buildEmbeddingText } from '@/lib/embedding'; 
import { verifyProjectAccess } from '@/lib/auth-utils';
import { PROJECT_ROLES } from '@/lib/roles';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const note = await prisma.noteEntity.findUnique({ where: { id } });

    if (!note || note.deletedAt) {
      return NextResponse.json({ error: '找不到該筆記或已刪除' }, { status: 404 });
    }

    const auth = await verifyProjectAccess(note.projectId, [
      PROJECT_ROLES.OWNER, PROJECT_ROLES.EDITOR, PROJECT_ROLES.VIEWER
    ]);
    if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

    return NextResponse.json(note, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: '無法取得筆記資料' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const oldNote = await prisma.noteEntity.findUnique({
      where: { id },
      select: { projectId: true, content: true, title: true }
    });

    if (!oldNote) return NextResponse.json({ error: '找不到該筆記' }, { status: 404 });
    
    const auth = await verifyProjectAccess(oldNote.projectId, [PROJECT_ROLES.OWNER, PROJECT_ROLES.EDITOR]);
    if (!auth.isAuthorized || !auth.userId) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const currentUserId = auth.userId;
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { name: true, image: true }
    });

    const body = await request.json();
    const { id: _frontendId, name, category, saveVersion, versionName, ...restData } = body;

    let pureFormFields = restData.content && typeof restData.content === 'object' ? restData.content : restData;
    const { versions: _fieldsIv, formType: _, ...cleanFormFields } = pureFormFields as any;

    const finalContent = {
      ...cleanFormFields,
      formType: category || (pureFormFields as any).formType || "custom"
    };

    const oldContent = (oldNote.content as any) || {};
    let currentVersions = Array.isArray(oldContent.versions) 
      ? oldContent.versions.map((v: any) => {
          if (v.content && v.content.versions) {
            const { versions: _, ...cleanContent } = v.content;
            return { ...v, content: cleanContent };
          }
          return v;
        })
      : [];

    const shouldSaveVersion = saveVersion === true || saveVersion === 'true' || currentVersions.length === 0;

    if (shouldSaveVersion) {
      currentVersions.push({
        timestamp: Date.now(),
        name: name || oldNote.title || "未命名版本",
        versionName: versionName || null,
        authorId: currentUserId,
        authorName: currentUser?.name || '未知寫手',
        authorImage: currentUser?.image || null,
        content: { ...finalContent } 
      });
    }

    const contentToSave = { ...finalContent, versions: currentVersions };

    let updatedNote = await prisma.noteEntity.update({
      where: { id },
      data: {
        title: name || oldNote.title,
        content: JSON.parse(JSON.stringify(contentToSave)), 
        updatedAt: new Date(),
      }
    });

    // RAG 向量化，讓 AI 能夠讀取大綱
    let vectorUpdated = false;
    try {
      const embeddingText = buildEmbeddingText(name || oldNote.title, finalContent);
      if (embeddingText && embeddingText.length > 5) {
        const vector = await generateEmbedding(embeddingText);
        if (vector && vector.length === 1024) {
          const vectorJsonString = JSON.stringify(vector);
          await prisma.$executeRaw`
            UPDATE "note_entities" 
            SET "embedding" = ${vectorJsonString}::vector
            WHERE "id" = ${id}::uuid
          `;
          vectorUpdated = true;
        }
      } else {
        await prisma.$executeRaw`UPDATE "note_entities" SET "embedding" = NULL WHERE "id" = ${id}::uuid`;
      }
      if (vectorUpdated) {
        const freshNote = await prisma.noteEntity.findUnique({ where: { id } });
        if (freshNote) updatedNote = freshNote;
      }
    } catch (e) {
      console.warn("⚠️ AI 向量化失敗，已防死隔離:", e);
    }

    if (shouldSaveVersion && versionName) {
      const [project, members] = await Promise.all([
        prisma.project.findUnique({ where: { id: oldNote.projectId }, select: { title: true, ownerId: true } }),
        prisma.projectMember.findMany({ where: { projectId: oldNote.projectId }, select: { userId: true } })
      ]);

      const recipientIds = new Set(members.map(m => m.userId));
      if (project?.ownerId) recipientIds.add(project.ownerId);
      recipientIds.delete(currentUserId);

      if (recipientIds.size > 0) {
        const notifications = Array.from(recipientIds).map(userId => ({
          recipientId: userId,
          actorId: currentUserId,
          type: 'SYSTEM' as const,
          projectId: oldNote.projectId,
          targetId: id,
          message: `${currentUser?.name || '某人'} 為《${project?.title || '未知專案'}》的筆記「${name || oldNote.title}」建立了新存檔：「${versionName}」`,
          link: `/novel_list/${oldNote.projectId}/notes` // 確保路由正確
        }));
        await prisma.notification.createMany({ data: notifications });
      }
    }

    return NextResponse.json(updatedNote, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: '無法更新筆記，後端異常' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const note = await prisma.noteEntity.findUnique({ where: { id }, select: { projectId: true } });

    if (!note) return NextResponse.json({ error: '找不到該筆記' }, { status: 404 });

    const auth = await verifyProjectAccess(note.projectId, [PROJECT_ROLES.OWNER, PROJECT_ROLES.EDITOR]);
    if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.status });
    
    await prisma.noteEntity.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
    return NextResponse.json({ message: '刪除成功' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: '無法刪除筆記' }, { status: 500 });
  }
}