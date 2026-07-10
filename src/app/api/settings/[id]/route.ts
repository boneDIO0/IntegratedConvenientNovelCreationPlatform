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
// 🔍 GET 請求：取得指定設定項目（前端拿 content.versions 來渲染歷史紀錄清單）
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
// 📝 PUT 請求：更新設定項目（若 saveVersion 為 true 則自動建立歷史快照）
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

    // 🌟【精準對齊修正】：撈出真正的自訂屬性表單資料
    // 如果前端把很臭、真的等欄位包在 body.content 裡，我們就取 body.content；否則取其餘欄位
    let pureFormFields = {};
    if (restData.content && typeof restData.content === 'object') {
      pureFormFields = restData.content;
    } else {
      pureFormFields = restData;
    }

    // 徹底剝離可能殘留的舊 versions，防止無限套娃
    const { versions: _fieldsIv, formType: _, ...cleanFormFields } = pureFormFields as any;

    // 封裝成要存入資料庫 content 欄位的終極主體（把自訂區塊原封不動包進來）
    const finalContent = {
      ...cleanFormFields,
      formType: category || (pureFormFields as any).formType || "custom"
    };

    const oldContent = (oldEntity.content as any) || {};
    let currentVersions = Array.isArray(oldContent.versions) ? [...oldContent.versions] : [];

    // 3. 判斷是否需要建立新歷史版本
    const shouldSaveVersion = saveVersion === true || saveVersion === 'true' || currentVersions.length === 0;

    if (shouldSaveVersion) {
      // 歷史版本快照，必須百分之百存入「這一次使用者在網頁上修改後的最新內容 (finalContent)」！
      // 絕不能再去撈資料庫裡的舊 pureOldContentData，否則會永遠定格在上一個版本
      const backupContent = { ...finalContent };

      currentVersions.push({
        timestamp: Date.now(),
        name: name || oldEntity.title || "未命名版本",
        content: backupContent // 🌟 確保時光機存下的是當下最新的改動！
      });
      console.log(`✅ [時光機後端] 已將本次最新改動寫入歷史快照。目前版本總數: ${currentVersions.length}`);
    }

    // 打包最新內容與完整的版本鏈
    const contentToSave = {
      ...finalContent,
      versions: currentVersions
    };

    // 4. 正式強制更新回資料庫
    const updatedEntity = await prisma.settingEntity.update({
      where: { id },
      data: {
        title: name || oldEntity.title,
        content: JSON.parse(JSON.stringify(contentToSave)), // 強制純化 JSON 寫入
        updatedAt: new Date(),
      }
    });

    // 5. AI 向量化完全隔離防死
    try {
      // 你的 buildEmbeddingText 邏輯...
    } catch (e) {
      console.warn("⚠️ AI 向量化跳過");
    }

    return NextResponse.json(updatedEntity, { status: 200 });

  } catch (error) {
    console.error(`🔴 PUT 核心崩潰錯誤:`, error);
    return NextResponse.json({ error: '無法更新設定，後端核心異常' }, { status: 500 });
  }
}

// ==========================================
// 🗑️ DELETE 請求：刪除整筆設定項目（連鎖清理孤兒章節）
// ==========================================
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 找出這個設定屬於哪本小說
    const targetEntity = await prisma.settingEntity.findUnique({
      where: { id },
      select: { projectId: true }
    });

    if (!targetEntity) {
      return NextResponse.json({ error: '找不到該設定項目' }, { status: 404 });
    }

    // 刪除設定僅限擁有者與編輯者
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