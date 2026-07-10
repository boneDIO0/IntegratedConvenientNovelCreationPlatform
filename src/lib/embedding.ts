// src/lib/embedding.ts
import { pipeline } from '@huggingface/transformers';
import path from 'path';
//這邊使用本地模型進行embedding相關的流程
// 使用 Singleton 模式，確保模型在 Next.js 運行期間只被載入記憶體一次，避免記憶體洩漏

/**
 * 內部函式：初始化並獲取本地 BGE-M3 模型執行實例
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
 * 【核心工具】全域通用文字向量化函式
 * @param text 需要轉成向量的小說內文、角色設定、或是 RAG 搜尋關鍵字
 * @returns 承諾返回一個長度固定為 1024 的 number[] 陣列
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
export async function generateEmbedding(text: string): Promise<number[]> {
  // 防呆機制：如果傳進來的是空字串、純空格或 Null，直接回傳空陣列或報錯，避免浪費算力
  if (!text || text.trim() === '') {
    console.warn("⚠️ [Embedding System] 偵測到空文字輸入，跳過向量化。");
    return [];
  }

  try {
    // 依然維持 getPipeline 的呼叫，確保初始化檢查機制正常運作
    await getPipeline();
    
    // 呼叫 Hugging Face 官方託管的 BGE-M3 模型 API
    const modelId = "BAAI/bge-m3"; 
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${modelId}`,
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
    
    // 將線上 API 回傳的數據，轉換為你原本指定的標準 JavaScript 浮點數陣列
    // 註：Hugging Face BGE-M3 預設會做 Mean Pooling + Normalize 並直出 1024 維陣列
    const embeddingArray = Array.isArray(result[0]) ? (result[0] as number[]) : (result as number[]);
    
    // 安全檢查：驗證產出的維度是否為 BGE-M3 指定的 1024 維（完全保留你原本的邏輯）
    if (embeddingArray.length !== 1024) {
      throw new Error(`向量維度異常：預期 1024，實際產出 ${embeddingArray.length}`);
    }
    
    return embeddingArray;
  } catch (error) {
    console.error("❌ [Embedding System] 文字向量化過程中發生異常:", error);
    throw error;
  }
}