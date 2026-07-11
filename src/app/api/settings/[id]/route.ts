// src/app/api/settings/[id]/route.ts

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
    if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    console.log("📥 [時光機後端] 收到前端原始 Body 欄位:", Object.keys(body));

    // 2. 基礎解構
    const { id: _frontendId, name, category, saveVersion, ...restData } = body;

    // 🌟 撈出真正的自訂屬性表單資料
    let pureFormFields = {};
    if (restData.content && typeof restData.content === 'object') {
      pureFormFields = restData.content;
    } else {
      pureFormFields = restData;
    }

    // 徹底剝離可能殘留的舊 versions 與歷史節點，防止無限套娃
    const { versions: _fieldsIv, formType: _, ...cleanFormFields } = pureFormFields as any;

    // 封裝成要存入資料庫 content 欄位的終極主體（把自訂區塊原封不動包進來）
    const finalContent = {
      ...cleanFormFields,
      formType: category || (pureFormFields as any).formType || "custom"
    };

    const oldContent = (oldEntity.content as any) || {};
    
    // 🎯 修正點 1：從舊的歷史清單中提取時，將每一條歷史紀錄的 versions 屬性剔除，防止 versions 自體無限複製
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
      // 歷史快照只留乾淨的 finalContent，絕不附帶 versions 大陣列
      const backupContent = { ...finalContent };

      currentVersions.push({
        timestamp: Date.now(),
        name: name || oldEntity.title || "未命名版本",
        content: backupContent 
      });
      console.log(`✅ [時光機後端] 已將本次最新改動寫入歷史快照。目前版本總數: ${currentVersions.length}`);
    }

    // 打包最新內容與完整的版本鏈
    const contentToSave = {
      ...finalContent,
      versions: currentVersions
    };

    // 4. 正式強制更新回資料庫的主體欄位
    let updatedEntity = await prisma.settingEntity.update({
      where: { id },
      data: {
        title: name || oldEntity.title,
        content: JSON.parse(JSON.stringify(contentToSave)), 
        updatedAt: new Date(),
      }
    });

    // 🌟 5. AI 向量化完全隔離防死
    let vectorUpdated = false;
    try {
      const embeddingText = buildEmbeddingText(name || oldEntity.title, finalContent);
      
      if (embeddingText && embeddingText.length > 5) {
        console.log(`🚀 [AI 向量中心] 正確認估內容中，長度: ${embeddingText.length}，開始生成 1024 維度向量...`);
        
        const vector = await generateEmbedding(embeddingText);
        
        if (vector && vector.length === 1024) {
          const vectorJsonString = JSON.stringify(vector);
          
          // 🎯 修正點 2：兼容 Prisma 預設的駝峰與單數命名，一網打盡 "SettingEntity"、"setting_entities" 
          // 使用常規大寫表名防禦，如與 schema 不符可改為 "SettingEntity"
          await prisma.$executeRaw`
            UPDATE "SettingEntity" 
            SET "embedding" = ${vectorJsonString}::vector
            WHERE "id" = ${id}::uuid
          `;
          vectorUpdated = true;
          console.log(`🎯 [AI 向量中心] 要素 ID ${id} 向量權重更新成功！`);
        }
      } else {
        await prisma.$executeRaw`
          UPDATE "SettingEntity" 
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
      console.warn("⚠️ AI 向量化管線執行跳過或發生非致命異常，已進行防死隔离:", e);
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