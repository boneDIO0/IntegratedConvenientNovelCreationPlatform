// 留言板元件
'use client'
/* declare to be a client component
useState and onClick are available */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Message } from '@/types/message';
import { usePathname } from 'next/navigation';

export function DiscussionBoard() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const novelId = pathname?.startsWith('/novel_list/') ? pathname.split('/')[2] : null;

  /* 建立狀態儲存使用者的輸入和 API 的回應
     記住現在正在編輯哪一則留言的 ID (null 代表沒在編輯) */
  const [editingId, setEditingId] = useState<string | null>(null);
  // 記住編輯框裡面的文字
  const [editContent, setEditContent] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const fetchMessages = async () => {
    if (!novelId || novelId === 'undefined') return;

    try {
      const res = await fetch(`/api/discussions?projectId=${novelId}`);
      const json = await res.json();
      setMessages(json.data || []);
    } catch (error) {
      console.error('抓取留言失敗', error);
    }
  };

  // 網頁一載入時自動執行一次抓取
  useEffect(() => {
    fetchMessages();
  }, [novelId]);

  // 將資料給後端 API
  const handleSubmit = async () => {
    // 防呆: 如果什麼都沒打就不理他
    if (!content.trim()) return; 

    if (!session?.user?.id) {
      alert("請先登入才能留言！");
      return;
    }

    alert(`
      準備檢查變數...
      1. 留言內容 (content): ${content}
      2. 作者 ID (authorId): ${session.user.id}
      3. 小說 ID (novelId): ${novelId}
    `);

    // 🌟 我們也在前端加上跟後端一樣的防護網
    if (!novelId || novelId === 'undefined') {
      alert("抓到兇手了！novelId 是空的或 undefined，難怪後端會退件！");
      return; // 踩剎車，不發送 fetch
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/discussions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: novelId,
          authorId: session.user.id,
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
      alert('留言發布失敗' + error.message);
    } finally {
      setIsLoading(false); // 解除按鈕鎖定
    }
  };

  // 發送更新指令給後端
  const handleUpdate = async (id: string) => {
    if (!editContent.trim()) return;
    try{
      const res = await fetch(`/api/discussions/${id}`, {
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }) 
      });
      if (res.ok) {
        setEditingId(null); // 關閉留言編輯模式
        fetchMessages();
      }
    } catch (error) {
      alert ('編輯過程發生錯誤')
    }
  }

  // 發送刪除指令給後端
  const handleDelete = async (id: string) => {
    if (!window.confirm('確認要刪除這則留言嗎？這項操作將無法復原！')) return;

    try{
      const res = await fetch(`/api/discussions/${id}`, { method: 'DELETE'}, );
      if (res.ok) {
        setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== id));
      }
    } catch (error) {
      alert('刪除過程發生錯誤')
    }
  }

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
        <h2 className="text-lg font-bold text-gray-700">留言列表 ({messages?.length || 0})</h2>
        
        {messages?.length === 0 ? (
          <p className="text-gray-500 text-center py-4">目前還沒有討論</p>
        ) : (
          // 以 map 迴圈將陣列裡的每一筆資料變成一個 UI 卡片
          messages.map((msg) => (
            <div key={msg.id} className="p-4 border rounded-lg bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-sm text-blue-600">{msg.users?.name || '未知使用者'}</span>
                
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">
                    {new Date(msg.createdAt).toLocaleString()}
                  </span>
                  {/* 這裡使用危險按鈕*/}
                  <Button 
                    variant="destructive" 
                    size="xs" 
                    onClick={() => handleDelete(msg.id)}
                  >
                    🗑️
                  </Button>
                  {/* 這裡使用隱形按鈕*/}
                  <Button 
                    variant="ghost" 
                    size="xs" 
                    onClick={() => { setEditingId(msg.id); setEditContent(msg.content); }}
                  >
                    🖋️
                  </Button>
                </div>

                <span className="text-xs text-gray-400">
                  {new Date(msg.createdAt).toLocaleString()}
                </span>
              </div>
              {/* 如果這則留言的 ID 等於正在編輯的 ID，就顯示輸入框 */}
                {editingId === msg.id ? (
                  <div className="mt-2">
                    <textarea
                      className="w-full p-2 border rounded-md"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <Button size="xs" variant="ghost" onClick={() => setEditingId(null)}>取消</Button>
                      <Button size="xs" onClick={() => handleUpdate(msg.id) } disabled={!editContent.trim()}>儲存</Button>
                    </div>
                  </div>
                ) : (
                  // 如果沒有在編輯，就正常顯示文字
                  <p className="text-gray-800 whitespace-pre-wrap">{msg.content}</p>
                )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}