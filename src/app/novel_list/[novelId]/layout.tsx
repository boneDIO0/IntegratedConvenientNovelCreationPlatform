import RoleInitializer from "@/components/RoleInitializer";
import Navbar from "@/components/Navbar";
import { verifyProjectAccess } from "@/lib/auth-utils";

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
  
  // 查詢並取得權限
  const auth = await verifyProjectAccess(novelId, ['OWNER', 'EDITOR', 'VIEWER']);
  const userRole = auth.isAuthorized && auth.role ? auth.role : 'VIEWER';

  return (
    <>
      {/* 呼叫隱形注入器，把伺服器查到的權限塞進全域 Context */}
      <RoleInitializer serverRole={userRole} />

      <Navbar projectId={novelId} role={userRole} />
      
      {/* 渲染原本的 Client Component (page.tsx) */}
      {children}
    </>
  );
}