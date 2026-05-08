import { NextResponse } from 'next/server';

// 1. GET 請求：讀取所有設定集資料
export async function GET() {
  try {
    // 🚀 [這裡交給後端同學]：從資料庫撈出所有的目錄與設定項目
    const data = await db.settings.findMany(); 
    
    // 假裝我們從資料庫撈到了資料，回傳給前端
    const data: any[] = []; // 替換成真實資料
    
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("GET /api/settings 錯誤:", error);
    return NextResponse.json({ error: '無法讀取設定資料' }, { status: 500 });
  }
}

// 2. POST 請求：新增一個設定項目或目錄
export async function POST(request: Request) {
  try {
    // 取得前端傳過來的資料 (也就是你在 frontend fetch 裡寫的 body)
    const body = await request.json();
    
    // 🚀 [這裡交給後端同學]：將 body 的內容寫入資料庫
    // const newSetting = await db.settings.create({ data: body });

    return NextResponse.json({ message: '新增成功', data: body }, { status: 201 });
  } catch (error) {
    console.error("POST /api/settings 錯誤:", error);
    return NextResponse.json({ error: '無法新增設定' }, { status: 500 });
  }
}