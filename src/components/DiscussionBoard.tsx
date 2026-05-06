// 留言板元件
'use client'
/* declare to be a client component
useState and onClick are available */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Message } from '@/types/message';

export function DiscussionBoard() {

  // 建立狀態儲存使用者的輸入和 API 的回應
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/discussions');
      const data = await res.json();
      setMessages(data);
    } catch (error) {
      console.error('抓取留言失敗', error);
    }
  };

  // 網頁一載入時自動執行一次抓取
  useEffect(() => {
    fetchMessages();
  }, []);

  // 將資料給後端 API
  const handleSubmit = async () => {
    // 防呆: 如果什麼都沒打就不理他
    if (!content.trim()) return; 

    setIsLoading(true);

    try {
      const res = await fetch('/api/discussions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: '初級寫手', // Demo 先寫死
          content: content // 放入 textarea 取得的純文字
        }),
      });

      // API 回傳成功
      if (res.ok) {
        setContent(''); // 清空輸入框
        fetchMessages(); // 重新抓取一次最新留言，畫面就會自動更新
      }

    } catch (error: any) {
      // 捕捉錯誤並顯示給使用者看
      alert('發布失敗' + error.message);
    } finally {
      setIsLoading(false); // 解除按鈕鎖定
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 space-y-6">
      {/* --- 輸入區塊 --- */}
      <div className="p-6 border rounded-lg shadow-sm bg-white">
        <h2 className="text-xl font-bold mb-4">新增留言</h2>
        <textarea
          className="w-full h-24 p-3 border rounded-md focus:ring-2 focus:ring-blue-500 resize-none mb-4"
          placeholder="在這裡暢所欲言..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isLoading}
        />
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={isLoading || !content.trim()}>
            {isLoading ? '傳送中...' : '發布留言'}
          </Button>
        </div>
      </div>

      {/* --- 留言列表區塊 --- */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-700">留言列表 ({messages.length})</h2>
        
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center py-4">目前還沒有討論</p>
        ) : (
          // 以 map 迴圈將陣列裡的每一筆資料變成一個 UI 卡片
          messages.map((msg) => (
            <div key={msg.id} className="p-4 border rounded-lg bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-sm text-blue-600">{msg.authorName}</span>
                <span className="text-xs text-gray-400">
                  {new Date(msg.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-gray-800 whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}