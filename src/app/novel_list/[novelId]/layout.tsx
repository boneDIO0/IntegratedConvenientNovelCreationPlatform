import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import prisma from "@/lib/prisma";
import RoleInitializer from "@/components/RoleInitializer";

export default async function NovelLayout({ 
  children, 
  params 
}: { 
  children: React.ReactNode;
  params: Promise<{ novelId: string }>
}) {
  // 解開 Promise 拿到真實的 novelId 字串
  const resolvedParams = await params;
  const novelId = resolvedParams.novelId;
  
  // 取得登入者資訊
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  // 預設唯讀權限
  let userRole = 'viewer'; 
  
  if (userId) {
    // 去資料庫查詢使用者在這本小說的權限
    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: novelId,
          userId: userId,
        }
      },
      select: { role: true }
    });
    
    if (membership?.role) {
      userRole = membership.role; 
    }
  }

  return (
    <>
      {/* 呼叫隱形注入器，把伺服器查到的權限塞進全域 Context */}
      <RoleInitializer serverRole={userRole} />
      
      {/* 渲染原本的 Client Component (page.tsx) */}
      {children}
    </>
  );
}