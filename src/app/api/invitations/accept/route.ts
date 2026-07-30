import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config'; // 確保路徑對齊你們的專案
import prisma from '@/lib/prisma';

/**
 * 📥 POST: 接受專案邀請並加入成為成員
 */
export async function POST(request: NextRequest) {
  try {
    // 驗證登入狀態，必須登入才能接受邀請
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: '請先登入系統才能接受邀請' }, { status: 401 });
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: '缺少邀請碼 (Token)' }, { status: 400 });
    }

    const invitation = await prisma.projectInvitation.findUnique({
      where: { token },
      include: {
        project: {
          select: { id: true, title: true, ownerId: true }
        }
      }
    });

    // 無效狀態防禦
    if (!invitation) {
      return NextResponse.json({ error: '無效的邀請連結，請確認網址是否完整' }, { status: 404 });
    }

    if (invitation.usedAt) {
      return NextResponse.json({ error: '此邀請連結已被使用過了，請請房主重新產生' }, { status: 403 });
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json({ error: '此邀請連結已過期失效' }, { status: 403 });
    }

    // 取得目前操作者的 User ID
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: '找不到您的使用者資料' }, { status: 404 });
    }

    // 防呆：房主不能點擊自己的邀請連結
    if (invitation.project.ownerId === user.id) {
      return NextResponse.json({ error: '您已經是此專案的擁有者囉！' }, { status: 400 });
    }

    // 檢查使用者是否已為該專案成員
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: invitation.projectId,
          userId: user.id
        }
      }
    });

    if (existingMember) {
      // 即使他已經是成員，我們也把這張邀請函作廢，避免連結外流
      await prisma.projectInvitation.update({
        where: { id: invitation.id },
        data: { usedAt: new Date() }
      });
      return NextResponse.json({ 
        message: '您已經是此專案的成員了！即將為您導向專案...',
        projectId: invitation.projectId
      }, { status: 200 });
    }

    // 核心交易：將使用者加入專案，並同時作廢這張邀請函
    await prisma.$transaction([
      prisma.projectMember.create({
        data: {
          projectId: invitation.projectId,
          userId: user.id,
          role: invitation.role,
        }
      }),
      prisma.projectInvitation.update({
        where: { id: invitation.id },
        data: { usedAt: new Date() }
      })
    ]);

    console.log(`🎉 [邀請系統] 使用者 ${user.name} 已成功加入專案 ${invitation.project.title}，身分：${invitation.role}`);

    return NextResponse.json({
      success: true,
      message: `成功加入專案「${invitation.project.title}」！`,
      projectId: invitation.projectId
    }, { status: 200 });

  } catch (error) {
    console.error('🔴 [接受邀請失敗]:', error);
    return NextResponse.json({ error: '系統處理邀請時發生錯誤' }, { status: 500 });
  }
}