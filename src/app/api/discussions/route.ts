// 留言區 API (POST /api/discussions)
import { handleApiError } from '@/lib/ErrorHandler';

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // check if any data absent
    if (!body.chapterId || !body.authorName || !body.content) {
      return NextResponse.json(
        { status: "error", message: "留言失敗：請提供章節ID、作者名稱與留言內容！" },
        { status: 400 }
      );
    }

    /* **尚未連接 DB，先假裝連接成功** */
    return NextResponse.json(
      { status: "success", message: "成功送出留言(尚未連接資料庫)", data: body },
      { status: 201 }
    );

  } catch (error) {
    return handleApiError(error, "新增留言時發生異常！");
  }
}