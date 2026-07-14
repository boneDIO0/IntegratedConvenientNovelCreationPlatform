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

// src/lib/embedding.ts 內部的 generateEmbedding 函式

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim() === '') {
    console.warn("⚠️ [Embedding System] 偵測到空文字輸入，跳過向量化。");
    return [];
  }

  await getPipeline();
  const modelId = "BAAI/bge-m3";

  const hfEndpoints = [
    `https://api-inference.huggingface.co/pipeline/feature-extraction/${modelId}`, 
    `https://api-inference.huggingface.co/models/${modelId}`,                      
    `https://api.huggingface.co/v1/models/${modelId}`                              
  ];

  let lastError: any = null;

  for (let i = 0; i < hfEndpoints.length; i++) {
    const apiUrl = hfEndpoints[i];
    
    // 🎯 核心防禦：為每一次 fetch 裝載 1.5 秒的定時炸彈，逾期直接 Abort
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500); 

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
          options: { wait_for_model: true } 
        }),
        signal: controller.signal // 🎯 將控制訊號綁定給 fetch
      });

      // 順利回應，清除計時器
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HF API 回傳錯誤碼 ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      let embeddingArray: any = result;
      while (Array.isArray(embeddingArray) && embeddingArray.length > 0 && Array.isArray(embeddingArray[0])) {
        embeddingArray = embeddingArray[0];
      }

      if (!Array.isArray(embeddingArray)) {
        throw new Error(`API 返回資料無法解析為數值陣列: ${JSON.stringify(result)}`);
      }

      const finalVector = embeddingArray as number[];

      if (finalVector.length !== 1024) {
        throw new Error(`向量維度異常：預期 1024，實際產出 ${finalVector.length}`);
      }

      console.log(`🎯 [Embedding System] 向量化成功！使用節點 [${i + 1}]`);
      return finalVector;

    } catch (error: any) {
      clearTimeout(timeoutId); // 發生錯誤也清除計時器
      
      // 判定是否為逾時中斷
      const isTimeout = error.name === 'AbortError';
      const errorMessage = isTimeout ? "連線超時 1.5 秒被強行熔斷" : (error.message || error);
      
      lastError = new Error(errorMessage);
      console.warn(`⚠️ [Embedding System] 節點 [${i + 1}] 失敗: ${errorMessage}`);
      
      if (i === hfEndpoints.length - 1) break;
    }
  }

  // 🎯 安全列印：只列印安全字串，防止 Vercel 序列化崩潰
  const safeErrorMessage = lastError?.message || "未知網路阻斷";
  console.error(`❌ [Embedding System] 所有 Hugging Face 管道皆解析失敗: ${safeErrorMessage}`);
  return [];
}