// 留言板元件
'use client'
/* declare to be a client component
useState and onClick are available */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Message } from '@/types/message';
import { usePathname } from 'next/navigation';

interface DiscussionBoardProps {
  currentUserRole?: string; 
}

export function DiscussionBoard({ currentUserRole }: DiscussionBoardProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const novelId = pathname?.startsWith('/novel_list/') ? pathname.split('/')[2] : null;
  const isEditor = pathname?.includes('/editor');
  const chapterId = isEditor ? pathname.split('/')[4] : null;
  const currentChannelId = chapterId || "general";

  const normalizedUserRole = currentUserRole?.toUpperCase() || 'VIEWER';

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
      const res = await fetch(`/api/discussions?projectId=${novelId}&channelId=${currentChannelId}`);
      const json = await res.json();
      setMessages(json.data || []);
    } catch (error) {
      console.error('抓取留言失敗', error);
    }
  };

  // 網頁一載入時自動執行一次抓取
  useEffect(() => {
    fetchMessages();
  }, [novelId, currentChannelId]);

  // 將資料給後端 API
  const handleSubmit = async () => {
    // 防呆: 如果什麼都沒打就不理他
    if (!content.trim()) return; 

    if (!session?.user?.id) {
      alert("請先登入才能留言！");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/discussions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: novelId,
          content: content,
          channelId: currentChannelId
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
          messages.map((msg) => {
            const currentUserId = session?.user?.id;
            const isAuthor = currentUserId === msg.authorId; // 是不是本人寫的
            const isOwner = normalizedUserRole === 'OWNER'; // 是不是房主

            // 判斷按鈕顯示邏輯
            const canEdit = isAuthor; // 只有本人能改
            const canDelete = isAuthor || isOwner; // 本人或管理員能刪

            return (
              <div key={msg.id} className="p-4 border rounded-lg bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    {msg.users?.image ? (
                      <img 
                        src={msg.users.image} 
                        alt={msg.users.name || 'User'} 
                        className="w-8 h-8 rounded-full border border-gray-200 object-cover shrink-0 shadow-sm"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0 border border-indigo-200">
                        {msg.users?.name?.charAt(0) || '?'}
                      </div>
                    )}
                    
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-slate-800 flex items-center gap-2">
                        {msg.users?.name || '未知使用者'}
                        {isAuthor && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-sm font-semibold">你</span>}
                      </span>

                      <span className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(msg.createdAt).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {canDelete && (
                      <Button 
                        variant="destructive" 
                        size="xs" 
                        onClick={() => handleDelete(msg.id)}
                        title="刪除留言"
                      >
                        🗑️
                      </Button>
                    )}
                    
                    {canEdit && (
                      <Button 
                        variant="ghost" 
                        size="xs" 
                        onClick={() => { setEditingId(msg.id); setEditContent(msg.content); }}
                        title="編輯留言"
                      >
                        🖋️
                      </Button>
                    )}
                  </div>
                </div>

                {editingId === msg.id ? (
                  <div className="mt-2 ml-11">
                    <textarea
                      className="w-full p-2 border rounded-md"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <Button size="xs" variant="ghost" onClick={() => setEditingId(null)}>取消</Button>
                      <Button size="xs" onClick={() => handleUpdate(msg.id)} disabled={!editContent.trim()}>儲存</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-800 whitespace-pre-wrap ml-11">{msg.content}</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}