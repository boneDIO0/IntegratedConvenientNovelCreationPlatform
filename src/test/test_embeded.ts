// test-embed.ts
import { generateEmbedding } from '@/lib/embedding';

async function runTest() {
  console.log("--------------------------------------------------");
  console.log("⏳ 正在初始化本地 BGE-M3 模型...");
  const startTime = Date.now();

  // 測試小說內文
  const testText = "陸大有急忙奔入內室，大喊：『大師哥！不好了，小師妹被嵩山派的人攔截了！』";

  try {
    const vector = await generateEmbedding(testText);
    const endTime = Date.now();

    console.log("\n✅ [測試成功] 向量化計算順利完成！");
    console.log(`⏱️ 首次加載與運算總耗時: ${(endTime - startTime) / 1000} 秒`);
    console.log(`📊 產出的向量維度 (Array Length): ${vector.length}`);
    console.log("🧐 前 5 個維度的浮點數值為：");
    console.log(vector.slice(0, 5));
    console.log("--------------------------------------------------");
    
  } catch (error) {
    console.error("\n❌ [測試失敗] 發生錯誤：", error);
    console.log("--------------------------------------------------");
  }
}

runTest();