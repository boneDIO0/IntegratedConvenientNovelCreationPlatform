// 留言板元件
'use client'
/* declare to be a client component
useState and onClick are available */

import { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';

export function DiscussionBoard() {

  // 建立狀態儲存使用者的輸入和 API 的回應
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  // 將資料給後端 API
  const handleSubmit = async () => {
    // 防呆: 如果什麼都沒打就不理他
    if (!content.trim()) return; 

    setIsLoading(true);
    setFeedback(null);

    try {
      // 呼叫 API
      const res = await fetch('/api/discussions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenced_file: 'demo-chapter-01', // Demo 先寫死
          author: '初級寫手',     // Demo 先寫死
          content: content              // 放入 textarea 取得的純文字
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || '發生未知錯誤');
      }

      // API 回傳成功
      setFeedback({ type: 'success', msg: '🎉 ' + data.message });
      setContent(''); // 清空輸入框

    } catch (error: any) {
      // 捕捉錯誤並顯示給使用者看
      setFeedback({ type: 'error', msg: '❌ ' + error.message });
    } finally {
      setIsLoading(false); // 解除按鈕鎖定
    }
  };

  return (

    <div className="p-6 border rounded-lg shadow-sm bg-white max-w-2xl mx-auto mt-10">
      <h2 className="text-xl font-bold mb-4 border-b pb-2">章節討論區 (Demo 版)</h2>
      
      {/* 基礎純文字輸入框 */}
      <textarea
        className="w-full h-32 p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-4"
        placeholder="請輸入你的留言..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={isLoading}
      />

      {/* 回饋訊息顯示區 */}
      {feedback && (
        <div className={`mb-4 p-3 rounded-md text-sm ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {feedback.msg}
        </div>
      )}

      {/* 將按鈕綁定事件 */}
      <div className="flex justify-end">
        <Button 
          variant="default" 
          onClick={handleSubmit} 
          disabled={isLoading || !content.trim()}
        >
          {isLoading ? '傳送中...' : '發布留言'}
        </Button>
      </div>

      <h2 className="text-xl font-bold mb-4">所有按鈕展示</h2>
      {/* 所有按鈕展示 */}
      <div className="flex gap-4">
        <Button variant="default">一般</Button>
        <Button variant="destructive">危險</Button>
        <Button variant="outline">外框</Button>
        <Button variant="ghost">隱形</Button>
      </div>
    </div>

  );
}