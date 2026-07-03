import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config'; 

export async function verifyProjectAccess(projectId: string, allowedRoles: string[]) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { isAuthorized: false, error: 'Unauthorized', status: 401 };
  }

  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId: projectId,
        userId: session.user.id,
      },
    },
  });

  if (!membership || !membership.role || !allowedRoles.includes(membership.role)) {
    return { isAuthorized: false, error: 'Forbidden: 權限不足', status: 403, role: membership?.role };
  }

  return { isAuthorized: true, userId: session.user.id, role: membership.role };
}