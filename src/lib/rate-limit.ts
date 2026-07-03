// src/lib/rate-limit.ts
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
//TODO：Vercel後台的Storage要開Upstash
// 🚀 1. 初始化 Upstash Redis 連線（會自動抓取環境變數中的 URL 與 TOKEN）
const redis = Redis.fromEnv();

interface RateLimitConfig {
  limit?: number;        // 允許的最大次數
  windowSeconds?: number;    // 時間視窗（秒）
}

export async function rateLimiter(request: Request, config?: RateLimitConfig) {
  const limit = config?.limit || 10;
  const windowSeconds = config?.windowSeconds || 60;

  // 🚀 2. 取得客戶端的真實 IP
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

  try {
    // 🚀 3. 建立限流器實例（使用滑動視窗演算法 Sliding Window）
    const ratelimit = new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      analytics: true, // 開啟後台圖表分析（選填）
      prefix: 'novel_ratelimit',
    });

    // 🚀 4. 執行限流檢查
    const { success, limit: maxLimit, remaining, reset } = await ratelimit.limit(ip);

    return {
      success,
      count: maxLimit - remaining,
      limit: maxLimit,
      remaining,
      resetTime: reset, // 告訴前端還要等多久（毫秒時間戳）
    };

  } catch (error) {
    // 🚨 優雅降級防線：萬一 Redis 掛了，放行請求，確保主功能不中斷
    console.error('[Upstash Ratelimit Error]:', error);
    return { success: true, count: 0, limit, remaining: 1, resetTime: Date.now() };
  }
}