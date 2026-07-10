import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateEmbedding,buildEmbeddingText } from '@/lib/embedding';
export async function POST(request: Request) {
  let isValid = false;
  let data: any = null;

  // 1. 第一個 try...catch：純粹搞定密碼，絕不跟後面混在一起
  try {
    const cloneRequest = request.clone(); 
    data = await cloneRequest.json();
    
    if (data && data.password === process.env.PASSWORD) {
      isValid = true; // 密碼對了，改標籤，不急著 return
    }
  } catch (error) {
    console.error("【密碼驗證區】解析 JSON 失敗:", error);
    // 失敗了也沒關係，isValid 維持 false，會被下面擋住
  }

  // 密碼檢查哨：不對就直接送他離開
  if (!isValid) {
    return Response.json({ error: '權限不足，請求遭到退回' }, { status: 403 });
  }
  try {
    console.log("🎬 [Maintenance] 開始掃描資料庫中缺失向量的設定項目...");

    // 🌟 DBA 優化：用 Raw SQL 只撈出向量為 NULL 且沒被軟刪除的舊資料
    // 同時 LEFT JOIN 把分類名稱拉進來，增加語意豐富度
    const missingEntities: any[] = await prisma.$queryRaw`
      SELECT e.id, e.title, e.content
      FROM "setting_entities" e
      WHERE e."embedding" IS NULL AND e."deleted_at" IS NULL
    `;

    if (missingEntities.length === 0) {
      return NextResponse.json({
        success: true,
        message: "資料庫非常健康！目前沒有任何缺失向量的設定項目。"
      }, { status: 200 });
    }

    console.log(`🔍 [Maintenance] 偵測到有 ${missingEntities.length} 筆資料需要補齊向量，開始執行本地 BGE-M3 計算...`);

    let successCount = 0;
    let skippedCount = 0;

    // 開始逐筆排隊計算（避免衝擊本地記憶體）
    for (const entity of missingEntities) {
      const mainTitle = entity.title;
      const contentObj = typeof entity.content === 'string' ? JSON.parse(entity.content) : (entity.content || {});

      // 1. 提取語意
      const embeddingText = buildEmbeddingText(mainTitle, contentObj);

      // 2. 判斷是否有實質內容需要算向量
      if (embeddingText && embeddingText.length > 5) {
        const vector = await generateEmbedding(embeddingText);

        if (vector && vector.length === 1024) {
          // 3. 用 Raw SQL 強行灌入 Neon
          const vectorJsonString = JSON.stringify(vector);
          await prisma.$executeRaw`
            UPDATE "setting_entities" 
            SET "embedding" = ${vectorJsonString}::vector
            WHERE "id" = ${entity.id}::uuid
          `;
          successCount++;
        }
      } else {
        // 如果改完發現根本沒實質內容（例如只有時間或空值），不浪費算力，直接記錄跳過
        skippedCount++;
      }
    }

    console.log(`🏁 [Maintenance] 向量修復完畢。成功：${successCount} 筆，跳過空值：${skippedCount} 筆。`);

    return NextResponse.json({
      success: true,
      total_scanned: missingEntities.length,
      successfully_updated: successCount,
      skipped_empty_data: skippedCount,
      message: `補齊成功！已將全站 ${successCount} 筆舊資料成功補上 1024 維度向量。`
    }, { status: 200 });

  } catch (error) {
    console.error("❌ [Maintenance] 補齊向量失敗，地基崩塌:", error);
    return NextResponse.json({ error: '維護端點發生毀滅性錯誤' }, { status: 500 });
  }
}