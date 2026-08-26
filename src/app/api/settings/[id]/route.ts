import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateEmbedding, buildEmbeddingText } from '@/lib/embedding'; 
import { verifyProjectAccess } from '@/lib/auth-utils';
import { PROJECT_ROLES } from '@/lib/roles';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ==========================================
// 🔍 GET 請求：取得指定設定項目
// ==========================================
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const settingEntity = await prisma.settingEntity.findUnique({
      where: { id },
    });

    if (!settingEntity) {
      return NextResponse.json({ error: '找不到該設定項目' }, { status: 404 });
    }

    const auth = await verifyProjectAccess(settingEntity.projectId, [
      PROJECT_ROLES.OWNER,
      PROJECT_ROLES.EDITOR,
      PROJECT_ROLES.VIEWER
    ]);
    if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

    if (settingEntity.deletedAt) {
      return NextResponse.json({ error: '該設定項目已被軟刪除' }, { status: 410 });
    }

    return NextResponse.json(settingEntity, { status: 200 });
  } catch (error) {
    console.error(`GET 設定錯誤:`, error);
    return NextResponse.json({ error: '無法取得設定資料' }, { status: 500 });
  }
}

// ==========================================
// 📝 PUT 請求：更新設定項目（自動建立乾淨的歷史快照）
// ==========================================
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 1. 先撈出目前資料庫的舊資料做歷史備份
    const oldEntity = await prisma.settingEntity.findUnique({
      where: { id },
      select: { projectId: true, content: true, title: true }
    });

    if (!oldEntity) {
      return NextResponse.json({ error: '找不到該設定項目' }, { status: 404 });
    }
    
    const auth = await verifyProjectAccess(oldEntity.projectId, [
      PROJECT_ROLES.OWNER,
      PROJECT_ROLES.EDITOR
    ]);
    if (!auth.isAuthorized || !auth.userId) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const currentUserId = auth.userId;
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { name: true, image: true }
    });
    const authorName = currentUser?.name || '未知寫手';
    const authorImage = currentUser?.image || null;

    const body = await request.json();
    console.log("📥 [時光機後端] 收到前端原始 Body 欄位:", Object.keys(body));

    // 2. 基礎解構（🌟 修正：明確將 title 抽離排除，避免殘留進 content）
    const { id: _frontendId, name, title: _passedTitle, category, saveVersion, versionName, ...restData } = body;

    // 🌟 撈出真正的自訂屬性表單資料
    let pureFormFields: Record<string, any> = {};
    if (restData.content && typeof restData.content === 'object') {
      pureFormFields = restData.content;
    } else {
      pureFormFields = restData;
    }

    // 徹底剝離可能殘留的舊 versions、formType 與單數 title，防止無限套娃與稱號污染
    const { versions: _fieldsIv, formType: _, title: _contentTitle, ...cleanFormFields } = pureFormFields as any;

    const targetName = name || oldEntity.title || "未命名設定";

    // 🌟 核心修正：乾淨處理 titles 稱號陣列（排除空值與等於本名的字串）
    let cleanTitles: string[] = [];
    const rawTitles = cleanFormFields.titles || (Array.isArray(body.titles) ? body.titles : []);
    if (Array.isArray(rawTitles)) {
      cleanTitles = rawTitles
        .map((t: any) => String(t).trim())
        .filter(t => t !== '' && t !== targetName);
    }

    // 封裝成要存入資料庫 content 欄位的終極主體
    const finalContent = {
      ...cleanFormFields,
      titles: cleanTitles,
      formType: category || (pureFormFields as any).formType || "custom"
    };

    // 確保單數 title 徹底從 content 移除
    delete (finalContent as any).title;

    const oldContent = (oldEntity.content as any) || {};
    
    // 從舊的歷史清單中提取乾淨 versions
    let currentVersions = Array.isArray(oldContent.versions) 
      ? oldContent.versions.map((v: any) => {
          if (v.content && v.content.versions) {
            const { versions: _, ...cleanContent } = v.content;
            return { ...v, content: cleanContent };
          }
          return v;
        })
      : [];

    // 3. 判斷是否需要建立新歷史版本
    const shouldSaveVersion = saveVersion === true || saveVersion === 'true' || currentVersions.length === 0;

    if (shouldSaveVersion) {
      const backupContent = { ...finalContent };

      currentVersions.push({
        timestamp: Date.now(),
        name: targetName,
        versionName: versionName || null,
        authorId: currentUserId,
        authorName: authorName,
        authorImage: authorImage,
        content: backupContent 
      });
      console.log(`✅ [時光機後端] 已將本次最新改動寫入歷史快照。目前版本總數: ${currentVersions.length}`);
    }

    // 打包最新內容與完整的版本鏈
    const contentToSave = {
      ...finalContent,
      versions: currentVersions
    };

    // 4. 正式更新回資料庫
    let updatedEntity = await prisma.settingEntity.update({
      where: { id },
      data: {
        title: targetName, // 資料庫主實體名稱存本名
        content: JSON.parse(JSON.stringify(contentToSave)), 
        updatedAt: new Date(),
      }
    });

    // 🌟 5. AI 向量化防護
    let vectorUpdated = false;
    try {
      const embeddingText = buildEmbeddingText(targetName, finalContent);
      
      if (embeddingText && embeddingText.length > 5) {
        console.log(`🚀 [AI 向量中心] 正確認估內容中，長度: ${embeddingText.length}，開始生成 1024 維度向量...`);
        
        const vector = await generateEmbedding(embeddingText);
        
        if (vector && vector.length === 1024) {
          const vectorJsonString = JSON.stringify(vector);
          
          await prisma.$executeRaw`
            UPDATE "setting_entities" 
            SET "embedding" = ${vectorJsonString}::vector
            WHERE "id" = ${id}::uuid
          `;
          vectorUpdated = true;
          console.log(`🎯 [AI 向量中心] 要素 ID ${id} 向量權重更新成功！`);
        }
      } else {
        await prisma.$executeRaw`
          UPDATE "setting_entities" 
          SET "embedding" = NULL
          WHERE "id" = ${id}::uuid
        `;
        console.log(`🫙 [AI 向量中心] 內文過短或已清空，向量欄位已安全重置為 NULL。`);
      }

      if (vectorUpdated) {
        const freshEntity = await prisma.settingEntity.findUnique({ where: { id } });
        if (freshEntity) updatedEntity = freshEntity;
      }

    } catch (e) {
      console.warn("⚠️ AI 向量化管線執行跳過或發生非致命異常，已進行防死隔離:", e);
    }

    // 發送通知
    if (shouldSaveVersion && versionName) {
      const [project, members] = await Promise.all([
        prisma.project.findUnique({ where: { id: oldEntity.projectId }, select: { title: true, ownerId: true } }),
        prisma.projectMember.findMany({ where: { projectId: oldEntity.projectId }, select: { userId: true } })
      ]);

      const projectName = project?.title || '未知專案';
      const settingName = targetName;

      const recipientIds = new Set(members.map(m => m.userId));
      if (project?.ownerId) recipientIds.add(project.ownerId);
      recipientIds.delete(currentUserId);

      if (recipientIds.size > 0) {
        const notifications = Array.from(recipientIds).map(userId => ({
          recipientId: userId,
          actorId: currentUserId,
          type: 'SYSTEM' as const,
          projectId: oldEntity.projectId,
          targetId: id,
          message: `${authorName} 為《${projectName}》的設定「${settingName}」建立了新存檔：「${versionName}」`,
          link: `/novel_list/${oldEntity.projectId}/settings`
        }));

        await prisma.notification.createMany({ data: notifications });
      }
    }

    return NextResponse.json(updatedEntity, { status: 200 });

  } catch (error) {
    console.error(`🔴 PUT 核心崩潰錯誤:`, error);
    return NextResponse.json({ error: '無法更新設定，後端核心異常' }, { status: 500 });
  }
}

// ==========================================
// 🗑️ DELETE 請求：刪除整筆設定項目
// ==========================================
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const targetEntity = await prisma.settingEntity.findUnique({
      where: { id },
      select: { projectId: true }
    });

    if (!targetEntity) {
      return NextResponse.json({ error: '找不到該設定項目' }, { status: 404 });
    }

    const auth = await verifyProjectAccess(targetEntity.projectId, [
      PROJECT_ROLES.OWNER,
      PROJECT_ROLES.EDITOR
    ]);

    if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.status });
    
    await prisma.settingEntity.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        chapters: { set: [] }
      }
    });
    return NextResponse.json({ message: '刪除成功，章節關聯已連鎖抹除' }, { status: 200 });
  } catch (error) {
    console.error(`DELETE 錯誤:`, error);
    return NextResponse.json({ error: '無法刪除設定' }, { status: 500 });
  }
}