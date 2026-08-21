'use client'

import { useSearchParams } from 'next/navigation';
import { DiscussionBoard } from '@/components/DiscussionBoard';
import { Suspense } from 'react';

function DiscussionContent() {
  const searchParams = useSearchParams();
  const novelId = searchParams.get('novelId') as string;
  const channelId = searchParams.get('channelId') || 'general';
  
  return (
    <div>
      {novelId ? (
        <DiscussionBoard
          projectId={novelId} 
          channelId={channelId} 
          mode="private" 
        />
      ) : (
        <div className="text-center text-slate-500 py-20 bg-white rounded-xl shadow-sm border border-slate-200">
          載入中，或無法取得專案資訊...
        </div>
      )}
    </div>
  );
}

export default function DiscussionPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <Suspense fallback={
        <div className="text-center text-slate-500 py-20 bg-white rounded-xl shadow-sm border border-slate-200">
          正在準備討論區...
        </div>
      }>
        <DiscussionContent />
      </Suspense>
    </main>
  );
}