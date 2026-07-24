import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config'; 

export async function verifyProjectAccess(projectId: string, allowedRoles: string[]) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return { isAuthorized: false, error: '未登入或 Session 授權已過期', status: 401 };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });

  if (!user) {
    return { isAuthorized: false, error: '找不到該使用者帳號', status: 404 };
  }

  const userId = user.id;

  // 📍 步驟 1：先檢查目前使用者是不是這本小說的「直接建立者 (Owner)」
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true }
  });

  if (!project) {
    return { isAuthorized: false, error: '找不到該專案', status: 404 };
  }

  // 📍 修正：統一轉換為大寫進行比對，避免大小寫造成的誤判
  const normalizedRoles = allowedRoles.map(r => r.toUpperCase());
  const isOwner = project.ownerId === userId;

  // 如果他是建立者就直接放行
  if (isOwner) {
    return { isAuthorized: true, userId, role: 'OWNER' };
  }

  // 📍 步驟 2：如果他不是建立者，才去檢查他是不是被邀請的「協作成員」
  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId: projectId,
        userId: userId,
      },
    },
  });

  // 成員表比對也一併統一轉大寫比較安全
  if (!membership || !membership.role || !normalizedRoles.includes(membership.role.toUpperCase())) {
    return { isAuthorized: false, error: 'Forbidden: 權限不足', status: 403, role: membership?.role };
  }

  return { isAuthorized: true, userId, role: membership.role };
}