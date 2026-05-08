import { NextResponse } from 'next/server';

// 定義 params 的型別
interface RouteParams {
  params: { id: string };
}

// 1. PUT 請求：更新指定的設定項目
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const id = params.id; // 從網址抓到的 ID
    const body = await request.json(); // 前端傳來的新資料

    // 🚀 [這裡交給後端同學]：根據 id 去資料庫更新對應的資料
    // await db.settings.update({ where: { id }, data: body });

    return NextResponse.json({ message: '更新成功' }, { status: 200 });
  } catch (error) {
    console.error(`PUT /api/settings/${params.id} 錯誤:`, error);
    return NextResponse.json({ error: '無法更新設定' }, { status: 500 });
  }
}

// 2. DELETE 請求：刪除指定的設定項目
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const id = params.id;

    // 🚀 [這裡交給後端同學]：根據 id 去資料庫刪除資料
    // await db.settings.delete({ where: { id } });

    return NextResponse.json({ message: '刪除成功' }, { status: 200 });
  } catch (error) {
    console.error(`DELETE /api/settings/${params.id} 錯誤:`, error);
    return NextResponse.json({ error: '無法刪除設定' }, { status: 500 });
  }
}