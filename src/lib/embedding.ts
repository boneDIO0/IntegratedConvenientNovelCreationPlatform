// src/lib/embedding.ts
import { pipeline } from '@huggingface/transformers';
import path from 'path';

// 使用 Singleton 模式，確保模型在 Next.js 運行期間只被載入記憶體一次，避免記憶體洩漏
let pipeInstance: any = null;

/**
 * 內部函式：初始化並獲取本地 BGE-M3 模型執行實例
 */
async function getPipeline() {
  if (!pipeInstance) {
    try {
      // 鎖定專案 public 資料夾底下的模型絕對路徑
      const modelPath = path.join(process.cwd(), 'public/models/bge-m3');
      
      // 初始化本地端 Transformers 工人
      pipeInstance = await pipeline('feature-extraction', modelPath, {
        local_files_only: true, // 🔒 嚴格鎖死！強制只讀取本地檔案，絕不上網下載
        model_file_name: 'model_quantized',
      });
      
      console.log("ℹ️ [Embedding System] 本地 BGE-M3 模型成功載入記憶體。");
    } catch (error) {
      console.error("❌ [Embedding System] 初始化本地模型失敗。請確認 public/models/bge-m3/ 檔案是否完整！", error);
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
    const extractor = await getPipeline();
    
    // 執行計算：BGE-M3 模型的標準配置為 Mean Pooling (平均池化) 與 Normalize (歸一化)
    const output = await extractor(text, { 
      pooling: 'mean', 
      normalize: true,
    });
    
    // 將 ONNX 特有的 Tensor 數據格式轉換為標準的 JavaScript 浮點數陣列
    const embeddingArray = Array.from(output.data as Float32Array);
    
    // 安全檢查：驗證產出的維度是否為 BGE-M3 指定的 1024 維
    if (embeddingArray.length !== 1024) {
      throw new Error(`向量維度異常：預期 1024，實際產出 ${embeddingArray.length}`);
    }
    
    return embeddingArray;
  } catch (error) {
    console.error("❌ [Embedding System] 文字向量化過程中發生異常:", error);
    throw error;
  }
}