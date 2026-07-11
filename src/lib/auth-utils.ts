import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config'; 

export async function verifyProjectAccess(projectId: string, allowedRoles: string[]) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { isAuthorized: false, error: 'Unauthorized', status: 401 };
  }

  const userId = session.user.id;

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
  const hasOwnerRoleAllowed = normalizedRoles.includes('OWNER');

  // 如果他是建立者，且這次操作允許 Owner 執行，就直接放行
  if (isOwner && hasOwnerRoleAllowed) {
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