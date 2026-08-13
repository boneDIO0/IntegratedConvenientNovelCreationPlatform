'use client'

import { useParams } from 'next/navigation';
import { DiscussionBoard } from '@/components/DiscussionBoard';

export default function DiscussionPage() {
  
  const params = useParams();
  const novelId = params?.novelId as string;
  // 如果網址沒有包含章節 ID，就預設為總討論區 'general'
  const chapterId = (params?.chapterId as string) || 'general';
  
  // 預設使用者角色為 'VIEWER'
  
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div>
        <h1 className="text-3xl font-extrabold mb-8">內部討論區</h1>
        {novelId ? (
          <DiscussionBoard
            projectId={novelId} 
            channelId={chapterId} 
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