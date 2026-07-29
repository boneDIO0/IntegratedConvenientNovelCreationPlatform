import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * 📥 GET: 透過 Token 讀取邀請函詳細資訊，供前端渲染邀請卡面使用
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: '缺少邀請碼' }, { status: 400 });
    }

    const invitation = await prisma.projectInvitation.findUnique({
      where: { token },
      include: {
        project: {
          select: { title: true, coverUrl: true } // 讓前端可以顯示專案名稱和封面
        },
        inviter: {
          select: { name: true, image: true } // 讓前端可以顯示是誰邀請的
        }
      }
    });

    if (!invitation) {
      return NextResponse.json({ error: '找不到此邀請連結，請確認網址是否完整' }, { status: 404 });
    }

    // 檢查是否已失效，但回傳 200，把失效狀態告訴前端，讓前端顯示「已過期」的 UI 而不是直接報錯崩潰
    if (invitation.usedAt) {
      return NextResponse.json({ status: 'used', error: '此邀請連結已被使用過' }, { status: 200 });
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json({ status: 'expired', error: '此邀請連結已過期' }, { status: 200 });
    }

    return NextResponse.json({
      status: 'valid',
      data: {
        projectName: invitation.project.title,
        projectCover: invitation.project.coverUrl,
        inviterName: invitation.inviter?.name || '專案擁有者',
        inviterImage: invitation.inviter?.image,
        role: invitation.role,
        expiresAt: invitation.expiresAt
      }
    }, { status: 200 });

  } catch (error) {
    console.error('🔴 [讀取邀請函失敗]:', error);
    return NextResponse.json({ error: '伺服器內部錯誤' }, { status: 500 });
  }
}