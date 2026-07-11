// src/lib/embedding.ts

// 🎯 修正 1：移除沒用到的 @huggingface/transformers 本地模型 import，精簡 Serverless 體積

/**
 * 內部函式：初始化並獲取線上 API 管道檢查
 */
let pipeInstance: boolean = false; 

async function getPipeline() {
  if (!pipeInstance) {
    try {
      // 驗證 Vercel 後台有沒有設定 Hugging Face Token，防呆檢查
      if (!process.env.HF_TOKEN) {
        throw new Error("Vercel 後台忘記設定 HF_TOKEN 環境變數了！");
      }
      pipeInstance = true;
      console.log("ℹ️ [Embedding System] 成功切換並初始化 Hugging Face 線上 API 管道。");
    } catch (error) {
      console.error("❌ [Embedding System] 初始化線上模型管道失敗。", error);
      throw error;
    }
  }
  return pipeInstance;
}

/**
 * 內部工具：提取 JSON 欄位中的實質文字內容
 */
function extractSemanticText(obj: any): string {
  if (!obj) return '';
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const pureNoiseRegex = /^[0-9:\-\s\.,\/\\]+$/;
  let textParts: string[] = [];

  function recurse(current: any) {
    if (typeof current === 'string') {
      const trimmed = current.trim();
      if (trimmed && trimmed.length > 1 && !uuidRegex.test(trimmed) && !pureNoiseRegex.test(trimmed)) {
        textParts.push(trimmed);
      }
    } else if (Array.isArray(current)) {
      current.forEach(item => recurse(item));
    } else if (typeof current === 'object' && current !== null) {
      for (const key in current) {
        if (['id', 'targetId', 'faction', 'projectId', 'categoryId', 'color', 'icon', 'date', 'time'].includes(key)) continue;
        recurse(current[key]);
      }
    }
  }

  recurse(obj);
  return textParts.join('，');
}

export function buildEmbeddingText(mainTitle: string, contentObj: any): string {
  const dynamicText = extractSemanticText(contentObj);
  if (!dynamicText && (!mainTitle || mainTitle.trim().length <= 1)) return '';
  return `項目：${mainTitle}。設定細節：${dynamicText || '暫無詳細描述'}`.trim();
}

/**
 * 【核心工具】全域通用文字向量化函式
 * @param text 需要轉成向量的小說內文、角色設定、或是 RAG 搜尋關鍵字
 * @returns 返回一個長度固定為 1024 的 number[] 陣列
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // 防呆機制：如果傳進來的是空字串、純空格或 Null，直接回傳空陣列，避免浪費算力
  if (!text || text.trim() === '') {
    console.warn("⚠️ [Embedding System] 偵測到空文字輸入，跳過向量化。");
    return [];
  }

  try {
    // 依然維持 getPipeline 的呼叫，確保初始化檢查機制正常運作
    await getPipeline();
    
    const modelId = "BAAI/bge-m3"; 
    
    // 🎯 修正 2：升級補上 /v1/ 路由，徹底解決 Vercel 環境下的 ENOTFOUND 解析地雷
    const apiUrl = `https://api-inference.huggingface.co/v1/models/${modelId}`;
    
    const response = await fetch(
      apiUrl,
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ inputs: text }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hugging Face API 報錯: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    // 🎯 修正 3：強化型別防禦，增加多維度陣列安全拆包機制（避免 API 回傳三維或畸形資料崩潰）
    let embeddingArray: any = result;
    
    // 如果回傳的是陣列套陣列（例如 [[0.1, 0.2, ...]]），向下遞迴拆包直到拿到純數字陣列
    while (Array.isArray(embeddingArray) && embeddingArray.length > 0 && Array.isArray(embeddingArray[0])) {
      embeddingArray = embeddingArray[0];
    }
    
    // 終極防線：如果拆完包後發現結構不對或被伺服器冷啟動物件覆蓋
    if (!Array.isArray(embeddingArray)) {
      throw new Error(`API 回傳資料格式不符合預期陣列，收到原始內容: ${JSON.stringify(result)}`);
    }
    
    const finalVector = embeddingArray as number[];

    // 安全檢查：驗證產出的維度是否為 BGE-M3 指定的 1024 維
    if (finalVector.length !== 1024) {
      throw new Error(`向量維度異常：預期 1024，實際產出 ${finalVector.length}`);
    }
    
    return finalVector;
  } catch (error) {
    console.error("❌ [Embedding System] 文字向量化過程中發生異常:", error);
    throw error;
  }
}