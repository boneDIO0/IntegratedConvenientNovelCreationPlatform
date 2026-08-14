import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { handleApiError } from '@/lib/ErrorHandler';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { verifyProjectAccess } from "@/lib/auth-utils";
import { PROJECT_ROLES } from "@/lib/roles";
import { rateLimiter } from '@/lib/rate-limit';

// 讀取留言 (GET)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ status: "error", message: "未授權，請先登入" }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const channelId = searchParams.get('channelId') || 'general';

    if (!projectId || projectId === 'undefined' || projectId === 'null') {
      return NextResponse.json({ status: "error", message: "缺少有效的小說 ID" }, { status: 400 });
    }

    const access = await verifyProjectAccess(projectId, [
      PROJECT_ROLES.OWNER, 
      PROJECT_ROLES.EDITOR, 
      PROJECT_ROLES.VIEWER
    ]);
    if (!access.isAuthorized) {
      return NextResponse.json({ status: "error", message: "無權限查看此專案的留言" }, { status: 403 });
    }

    const messages = await prisma.projectMessages.findMany({
      where: { projectId: projectId, channelId: channelId },
      orderBy: { createdAt: 'asc' }, // 舊的在上面，新的在下面
      include: {
        users: {
          select: { name: true, image: true }
        },
        projectMessages: { 
          select: {
            id: true,
            content: true,
            users: { select: { name: true } }
          }
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
    // 同個 IP 每 60 秒最多只能發送 10 則留言
    const rateLimitResult = await rateLimiter(request, {
      limit: 10,
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

    if (!body.content || !body.projectId) {
      return NextResponse.json(
        { status: "error", message: "留言失敗：缺少必要資訊" },
        { status: 400 }
      );
    }

    const access = await verifyProjectAccess(body.projectId, [
      PROJECT_ROLES.OWNER, 
      PROJECT_ROLES.EDITOR, 
      PROJECT_ROLES.VIEWER
    ]);
    if (!access.isAuthorized) {
      return NextResponse.json({ status: "error", message: "無權限在此專案留言" }, { status: 403 });
    }

    // 將 @ALL 替換為實際的 UUID 陣列
    let finalMentions = body.mentions && Array.isArray(body.mentions) ? [...body.mentions] : [];
    if (finalMentions.includes('ALL')) {
      const allMembers = await prisma.projectMember.findMany({
        where: { projectId: body.projectId },
        select: { userId: true }
      });
      // 移除 'ALL' 字串，換成所有成員的真實 ID
      finalMentions = finalMentions.filter(id => id !== 'ALL');
      const allUserIds = allMembers.map(m => m.userId);
      finalMentions = Array.from(new Set([...finalMentions, ...allUserIds])); // 去除重複
    }
    
    const newMessage = await prisma.projectMessages.create({
      data: {
        content: body.content,
        projectId: body.projectId,
        authorId: session.user.id,
        channelId: body.channelId || 'general',
        referencedMessageId: body.referencedMessageId || null, 
        mentions: finalMentions,
      }
    });

    const targetRecipientIds = finalMentions.filter(id => id !== session.user.id);

    // 新增通知給被標註的人
    if (targetRecipientIds.length > 0) {
      const [project, actor] = await Promise.all([
        prisma.project.findUnique({ where: { id: body.projectId }, select: { title: true } }),
        prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } })
      ]);

      const projectName = project?.title || '專案';
      const actorName = actor?.name || '某人';
      
      const isChapter = body.channelId && body.channelId !== 'general';
      const linkUrl = isChapter 
        ? `/novel_list/${body.projectId}/editor/${body.channelId}`
        : `/novel_list/${body.projectId}/discussions`;

      const notificationsToCreate = targetRecipientIds.map((recipientId: string) => ({
        recipientId: recipientId,
        actorId: session.user.id,
        type: 'MENTION' as const,
        projectId: body.projectId,
        targetId: newMessage.id,
        message: `${actorName} 在《${projectName}》的討論區提到了你`,
        link: linkUrl
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
    return handleApiError(error, "新增留言過程發生錯誤");
  }
}