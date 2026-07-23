import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyProjectAccess } from '@/lib/auth-utils';
import { PROJECT_ROLES } from '@/lib/roles';
import crypto from 'crypto';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * 🔗 POST: 為特定專案產生一組安全的成員邀請連結
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;

    // 僅擁有者能產生邀請碼
    const auth = await verifyProjectAccess(projectId, [PROJECT_ROLES.OWNER]);
    if (!auth.isAuthorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { role } = body;

    // 基礎參數防呆校驗
    if (!role || !['EDITOR', 'VIEWER'].includes(role)) {
      return NextResponse.json({ error: '請指定有效的邀請角色 (EDITOR 或 VIEWER)' }, { status: 400 });
    }

    const invitationToken = crypto.randomUUID();

    // 預設 7 天後過期
    const EXPIRES_IN_DAYS = 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + EXPIRES_IN_DAYS);

    // 寫入資料庫
    // auth.userId 為在 verifyProjectAccess 裡解析並封裝回傳的目前登入使用者 ID
    const newInvitation = await prisma.projectInvitation.create({
      data: {
        token: invitationToken,
        projectId: projectId,
        inviterId: auth.userId!,
        role: role,
        expiresAt: expiresAt,
      },
      select: {
        token: true,
        role: true,
        expiresAt: true,
      }
    });

    // 動態拼裝前端邀請網址
    // 實務上在本地端會是 localhost:3000，上線後會自動抓取 Vercel 的網域
    const origin = request.nextUrl.origin;
    const inviteLink = `${origin}/invite/${newInvitation.token}`;

    console.log(`✅ [邀請系統] 專案 ${projectId} 成功產生 ${role} 邀請連結，Token: ${newInvitation.token}`);

    return NextResponse.json({
      success: true,
      message: '邀請連結產生成功！',
      data: {
        inviteLink: inviteLink,
        role: newInvitation.role,
        expiresAt: newInvitation.expiresAt,
      }
    }, { status: 201 });

  } catch (error) {
    console.error('🔴 [產生邀請碼失敗]:', error);
    return NextResponse.json({ error: '伺服器內部錯誤，無法產生邀請連結' }, { status: 500 });
  }
}