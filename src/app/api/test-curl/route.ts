// src/app/api/test-curl/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const targetUrl = 'https://api-inference.huggingface.co';
  
  try {
    console.log(`📡 Vercel 正在嘗試連線至: ${targetUrl}`);
    
    // 模擬 curl -I 的行為
    const res = await fetch(targetUrl, {
      method: 'HEAD', // 只抓取 Header，速度快
      cache: 'no-store'
    });

    return NextResponse.json({
      status: '連線成功',
      statusCode: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries())
    });

  } catch (error: any) {
    // 如果發生 ENOTFOUND，這裡會精準捕獲
    return NextResponse.json({
      status: '連線失敗（可能遭遇 DNS 錯誤或防火牆阻擋）',
      error: error.message,
      cause: error.cause
    }, { status: 500 });
  }
}