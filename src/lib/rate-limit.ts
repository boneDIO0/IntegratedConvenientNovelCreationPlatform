
//TODO：Vercel後台的Storage要開Upstash
// 🚀 1. 初始化 Upstash Redis 連線（會自動抓取環境變數中的 URL 與 TOKEN）
const tracker = new Map<string, { count: number; resetTime: number }>();

interface RateLimitOptions {
  limit: number;        // 允許最大次數
  windowSeconds: number; // 時間窗口 (秒)
}

export async function rateLimiter(req: Request, options: RateLimitOptions) {
  // 優先抓取使用者 IP，若無則抓前端 User-Agent 或 fallback
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;

  const record = tracker.get(ip) || { count: 0, resetTime: now + windowMs };

  // 如果時間窗口已過，重置計數器
  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }

  record.count += 1;
  tracker.set(ip, record);

  const remaining = Math.max(0, options.limit - record.count);
  const success = record.count <= options.limit;

  return {
    success,
    remaining,
    resetTime: Math.ceil((record.resetTime - now) / 1000), // 剩餘秒數
  };
}