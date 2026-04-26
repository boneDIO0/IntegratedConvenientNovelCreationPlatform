import { DiscussionBoard } from '@/components/DiscussionBoard';

export default function DiscussionPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-extrabold mb-8">討論區 - 留言板</h1>
      
      {/* 呼叫留言板 UI 元件 */}
      <DiscussionBoard />
      
    </main>
  );
}