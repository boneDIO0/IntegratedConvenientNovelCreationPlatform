// 留言板 API (GET 和 POST)
import { handleApiError } from '@/lib/ErrorHandler';
import { NextResponse } from 'next/server';
import { getAllMessages, addMessage } from '@/lib/mockDiscussionMessages';
import { Message } from '@/types/message';

export async function GET() {
  const messages = getAllMessages();
  return NextResponse.json(messages, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // check if content absent
    if (!body.content) {
      return NextResponse.json(
        { status: "error", message: "留言失敗：留言內容不能為空" },
        { status: 400 }
      );
    }

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      authorName: body.authorName || '匿名訪客',
      content: body.content,
      createdAt: new Date().toISOString(),
    };

    addMessage(newMessage);

    /* **尚未連接 DB，先假裝連接成功** */
    return NextResponse.json(
      { status: "success", message: "成功留言", data: newMessage },
      { status: 201 }
    );

  } catch (error) {
    return handleApiError(error, "新增留言時發生錯誤");
  }
}