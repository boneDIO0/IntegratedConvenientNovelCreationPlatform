import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { handleApiError } from '@/lib/ErrorHandler';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { rateLimiter } from '@/lib/rate-limit';

// 讀取公開留言 (GET)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const channelId = searchParams.get('channelId') || 'explore'; // 章節選擇頁面預設為 explore

    if (!projectId) {
      return NextResponse.json({ status: "error", message: "缺少有效的小說 ID" }, { status: 400 });
    }

    // 確認該專案是公開狀態，否則不允許讀取留言
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        status: { in: ['SERIALIZING', 'COMPLETED'] },
        deletedAt: null
      }
    });

    if (!project) {
      return NextResponse.json({ status: "error", message: "找不到該公開作品" }, { status: 404 });
    }

    // 只能撈取公開屬性的 channel
    if (!channelId.startsWith('explore')) {
      return NextResponse.json({ status: "error", message: "無效的公開頻道" }, { status: 403 });
    }

    const messages = await prisma.projectMessages.findMany({
      where: { projectId: projectId, channelId: channelId },
      orderBy: { createdAt: 'asc' },
      include: {
        users: { 
          select: { 
            name: true, 
            image: true,
            memberships: {
              where: { projectId: projectId },
              select: { role: true }
            }
          } 
        },
        projectMessages: { 
          select: { id: true, content: true, users: { select: { name: true } } }
        }
      }
    });

    // 整理資料格式，讓前端更好渲染
    const formattedMessages = messages.map(msg => {
      // 提取 role，如果對象不是成員，陣列會是空的，回傳 null
      const memberRole = msg.users?.memberships?.[0]?.role || null;
      
      // 把 memberships 從物件中移除，保持 API 回傳格式乾淨
      const { memberships, ...userWithoutMemberships } = msg.users || {};

      return {
        ...msg,
        users: msg.users ? {
          ...userWithoutMemberships,
          role: memberRole // 把 role 扁平化附加在 users 物件上
        } : null
      };
    });

    return NextResponse.json({ status: "success", data: formattedMessages }, { status: 200 });

  } catch (error) {
    return handleApiError(error, "讀取公開留言發生錯誤");
  }
}

// 新增公開留言 (POST)
export async function POST(request: Request) {
  try {
    // 同個 IP 每 60 秒最多只能發送 5 則留言
    const rateLimitResult = await rateLimiter(request, {
      limit: 5,
      windowSeconds: 60
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          status: "error", 
          message: `發言太頻繁，請休息 ${rateLimitResult.resetTime} 秒後再試。` 
        }, 
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ status: "error", message: "未授權，請先登入" }, { status: 401 });
    }

    const body = await request.json();
    const channelId = body.channelId || 'explore';

    if (!body.content || !body.projectId) {
      return NextResponse.json({ status: "error", message: "留言失敗：缺少必要資訊" }, { status: 400 });
    }

    if (!channelId.startsWith('explore')) {
      return NextResponse.json({ status: "error", message: "只能在公開頻道留言" }, { status: 403 });
    }

    // 確認專案為公開狀態才能留言
    const project = await prisma.project.findFirst({
      where: { id: body.projectId, status: { in: ['SERIALIZING', 'COMPLETED'] } }
    });

    if (!project) {
      return NextResponse.json({ status: "error", message: "該作品尚未公開，無法留言" }, { status: 403 });
    }

    const newMessage = await prisma.projectMessages.create({
      data: {
        content: body.content,
        projectId: body.projectId,
        authorId: session.user.id,
        channelId: channelId,
        referencedMessageId: body.referencedMessageId || null, 
        mentions: body.mentions || [],
      }
    });

    // 發送站內通知給所有的專案成員
    const members = await prisma.projectMember.findMany({
      where: { projectId: body.projectId }
    });

    // 過濾掉留言者自己
    const recipients = members.filter(m => m.userId !== session.user.id);

    if (recipients.length > 0) {
      const actorName = session.user.name || '某位讀者';
      
      // 準備批次新增通知
      const notificationsToCreate = recipients.map(member => ({
        recipientId: member.userId,
        actorId: session.user.id,
        type: 'NEW_COMMENT' as const,
        projectId: body.projectId,
        targetId: newMessage.id,
        message: `${actorName} 在您的作品《${project.title}》留下了新評論`,
        link: `/explore/${body.projectId}` // 點擊跳轉到該作品的章節選擇頁面
      }));

      await prisma.notification.createMany({
        data: notificationsToCreate
      });
    }

    return NextResponse.json(
      { status: "success", message: "成功留言", data: newMessage },
      { status: 201 }
    );

  } catch (error) {
    return handleApiError(error, "新增公開留言發生錯誤");
  }
}