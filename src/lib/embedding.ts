// src/lib/embedding.ts

let pipeInstance: boolean = false; 

async function getPipeline() {
  if (!pipeInstance) {
    try {
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
 * 【核心工具】全域通用文字向量化函式（純 Hugging Face 多網域自動容錯版）
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim() === '') {
    console.warn("⚠️ [Embedding System] 偵測到空文字輸入，跳過向量化。");
    return [];
  }

  await getPipeline();
  const modelId = "BAAI/bge-m3";

  // 🎯 核心防禦：定義 3 組 Hugging Face 的等價官方 API 入口網域
  // 藉此避開 Vercel 或本地 ISP 單一網域的 DNS (ENOTFOUND) 解析地雷
  const hfEndpoints = [
    `https://api-inference.huggingface.co/pipeline/feature-extraction/${modelId}`, // 1. Pipeline 專屬路由
    `https://api-inference.huggingface.co/models/${modelId}`,                      // 2. 經典模型路由
    `https://api.huggingface.co/v1/models/${modelId}`                              // 3. 最新 v1 基礎網域
  ];

  let lastError: any = null;

  // 🔄 自動輪詢重試機制
  for (let i = 0; i < hfEndpoints.length; i++) {
    const apiUrl = hfEndpoints[i];
    try {
      console.log(`📡 [Embedding System] 嘗試連線 HF 節點 [${i + 1}/${hfEndpoints.length}]: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ 
          inputs: text,
          options: { wait_for_model: true } // 💡 強制讓 HF 伺服器在模型冷啟動時等待，防止噴 503 
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HF API 回傳錯誤碼 ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      // 🎯 安全拆包機制：向下遞迴拆開多維陣列
      let embeddingArray: any = result;
      while (Array.isArray(embeddingArray) && embeddingArray.length > 0 && Array.isArray(embeddingArray[0])) {
        embeddingArray = embeddingArray[0];
      }

      if (!Array.isArray(embeddingArray)) {
        throw new Error(`API 返回資料無法解析為數值陣列: ${JSON.stringify(result)}`);
      }

      const finalVector = embeddingArray as number[];

      // BGE-M3 規格驗證
      if (finalVector.length !== 1024) {
        throw new Error(`向量維度異常：預期 1024，實際產出 ${finalVector.length}`);
      }

      console.log(`🎯 [Embedding System] 向量化成功！使用節點 [${i + 1}]`);
      return finalVector;

    } catch (error: any) {
      lastError = error;
      console.warn(`⚠️ [Embedding System] 節點 [${i + 1}] 失敗: ${error.message || error}`);
      
      // 如果是最後一個節點也失敗了，就不再重試，直接跳出迴圈拋給 catch
      if (i === hfEndpoints.length - 1) break;
    }
  }

  // 🚨 終極防線：如果所有 HF 管道都爆了，回傳空陣列，保護 AI 助理/設定集 100% 不會當機斷線
  console.error("❌ [Embedding System] 所有 Hugging Face 線上 API 管道皆連線失敗:", lastError);
  return [];
}