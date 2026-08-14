import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyProjectAccess } from '@/lib/auth-utils';
import { PROJECT_ROLES } from '@/lib/roles';
import crypto from 'crypto';
import { Resend } from 'resend';
import { rateLimiter } from '@/lib/rate-limit';

const resend = new Resend(process.env.RESEND_API_KEY);

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * 🔗 POST: 為特定專案產生一組安全的成員邀請連結
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // 同一 IP 每 60 秒最多只能邀請 5 次
    const rateLimitResult = await rateLimiter(request, {
      limit: 5,
      windowSeconds: 60
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: `操作太頻繁，請等待 ${rateLimitResult.resetTime} 秒後再試。` },
        { status: 429 }
      );
    }
    
    const resolvedParams = await params;
    const { projectId } = resolvedParams;

    // 僅擁有者能產生邀請碼
    const auth = await verifyProjectAccess(projectId, [PROJECT_ROLES.OWNER]);
    if (!auth.isAuthorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { role, email } = body;

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
        email: email || null,
        expiresAt: expiresAt,
      },
      select: {
        id: true,
        token: true,
        role: true,
        email: true,
        expiresAt: true,
      }
    });

    // 動態拼裝前端邀請網址
    // 實務上在本地端會是 localhost:3000，上線後會自動抓取 Vercel 的網域
    const origin = request.nextUrl.origin;
    const inviteLink = `${origin}/invite/${newInvitation.token}`;

    let message = '邀請連結產生成功！';

    if (email) {
      const [project, inviter, targetUser] = await Promise.all([
        prisma.project.findUnique({ where: { id: projectId } }),
        prisma.user.findUnique({ where: { id: auth.userId! }, select: { name: true, email: true } }),
        prisma.user.findUnique({ where: { email: email } })
      ]);
      const projectName = project?.title || '未命名專案';
      const roleName = role === 'EDITOR' ? '協作寫手' : '檢視者';
      const inviterName = inviter?.name || inviter?.email || '某人';

      if (targetUser) {
        // 若對方已經是註冊會員 -> 直接發送站內小鈴鐺通知！
        await prisma.notification.create({
          data: {
            recipientId: targetUser.id,
            actorId: auth.userId!,
            type: 'INVITE', // 對應 Schema 的 Enum
            projectId: projectId,
            targetId: newInvitation.id,
            message: `${inviterName} 邀請您以「${roleName}」的身分加入專案《${projectName}》`,
            link: `/invite/${newInvitation.token}` // 點擊通知直接跳到接受頁面
          }
        });
        message = `已發送站內邀請通知給 ${targetUser.name || email}`;
      } else {
        // 若對方還沒註冊 -> 發送 Email
        await resend.emails.send({
          from: 'onboarding@resend.dev', // 測試階段用 Resend 的預設網域
          to: email,
          subject: `[邀請] 您受邀加入《${projectName}》的創作團隊`,
          html: `
            <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
              <h2>您收到了一份協作邀請！</h2>
              <p style="color: #555; line-height: 1.6;">
                <strong>${inviterName}</strong> 邀請您以「<strong>${roleName}</strong>」的身分加入專案《<strong>${projectName}</strong>》。
              </p>
              <p style="color: #555; line-height: 1.6;">請點擊下方按鈕接受邀請（連結將於 7 天後失效）：</p>
              <a href="${inviteLink}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; margin-top: 10px;">接受邀請</a>
              <p style="margin-top: 30px; font-size: 12px; color: #666;">如果按鈕無法點擊，請複製以下網址至瀏覽器貼上：<br>${inviteLink}</p>
            </div>
          `
        });
        message = `邀請信已成功寄送至 ${email}`;
      }
    }

    return NextResponse.json({
      success: true,
      message: message,
      data: {
        inviteLink: inviteLink,
        role: newInvitation.role,
        email: newInvitation.email,
        expiresAt: newInvitation.expiresAt,
      }
    }, { status: 201 });

  } catch (error) {
    console.error('🔴 [產生邀請碼失敗]:', error);
    return NextResponse.json({ error: '伺服器內部錯誤，無法產生邀請連結' }, { status: 500 });
  }
}