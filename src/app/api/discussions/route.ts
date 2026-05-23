// 檔案路徑：src/app/api/discussions/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // 🌟 召喚真實的資料庫引擎
import { handleApiError } from '@/lib/ErrorHandler';

// 讀取留言 (GET)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const channelId = searchParams.get('channelId') || 'general';

    if (!projectId || projectId === 'undefined' || projectId === 'null') {
      return NextResponse.json({ status: "error", message: "缺少有效的小說 ID" }, { status: 400 });
    }

    const messages = await prisma.projectMessages.findMany({
      where: { projectId: projectId, channelId: channelId },
      orderBy: { createdAt: 'asc' }, // 舊的在上面，新的在下面
      include: {
        users: { // 順便把留言者的名字和頭像抓出來！
          select: { name: true, image: true }
        }
      }
    });

    return NextResponse.json({ status: "success", data: messages }, { status: 200 });

  } catch (error) {
    return handleApiError(error, "讀取留言過程發生錯誤");
  }
}

// 新增留言 (POST)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.content || !body.projectId || !body.authorId) {
      return NextResponse.json(
        { status: "error", message: "留言失敗：缺少必要資訊" },
        { status: 400 }
      );
    }

    const newMessage = await prisma.projectMessages.create({
      data: {
        content: body.content,
        projectId: body.projectId,
        authorId: body.authorId,
        channelId: body.channelId || 'general'
      }
    });

    return NextResponse.json(
      { status: "success", message: "成功留言", data: newMessage },
      { status: 201 }
    );

  } catch (error) {
    return handleApiError(error, "新增留言過程發生錯誤");
  }
}