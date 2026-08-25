import RoleInitializer from "@/components/RoleInitializer";
import Navbar from "@/components/Navbar";
import { verifyProjectAccess } from "@/lib/auth-utils";
import { EditorUIProvider } from "@/contexts/EditorUIContext"; // 🌟 1. 引入全域 Context Provider

export default async function NovelLayout({ 
  children, 
  params 
}: { 
  children: React.ReactNode;
  params: Promise<{ novelId: string }>
}) {
  const resolvedParams = await params;
  const novelId = resolvedParams.novelId;
  
  const auth = await verifyProjectAccess(novelId, ['OWNER', 'EDITOR', 'VIEWER']);
  const userRole = auth.isAuthorized && auth.role ? auth.role.toLowerCase() : 'viewer';

  return (
    // 🌟 2. 將整個作品區塊包進 EditorUIProvider
    <EditorUIProvider>
      <div className="flex h-screen flex-col">
        {/* 注入伺服器權限到 Context */}
        <RoleInitializer serverRole={userRole} />

        <Navbar projectId={novelId} role={userRole} />
        
        <main className="flex-1 overflow-auto bg-slate-50 relative">
          {children}
        </main>
      </div>
    </EditorUIProvider>
  );
}