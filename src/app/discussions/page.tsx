'use client'

import { useParams, useSearchParams } from 'next/navigation';
import { DiscussionBoard } from '@/components/DiscussionBoard';

export default function DiscussionPage() {
  const searchParams = useSearchParams();
  const novelId = searchParams.get('novelId') as string;
  const channelId = searchParams.get('channelId') || 'general';
  
  // 預設使用者角色為 'VIEWER'
  
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div>
        {novelId ? (
          <DiscussionBoard
            projectId={novelId} 
            channelId={channelId} 
            mode="private" 
            // currentUserRole={userRole} // 未來如果有需要 OWNER 刪除權限，再把 role 傳進來即可
          />
        ) : (
          <div className="text-center text-slate-500 py-20 bg-white rounded-xl shadow-sm border border-slate-200">
            載入中，或無法取得專案資訊...
          </div>
        )}
      </div>
      
    </main>
  );
}