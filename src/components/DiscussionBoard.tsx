// 留言板元件
'use client'
/* declare to be a client component
useState and onClick are available */

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Message } from '@/types/message';
import { Reply, X } from 'lucide-react';
import { MentionsInput, Mention, SuggestionDataItem } from 'react-mentions';

interface DiscussionBoardProps {
  projectId: string;
  channelId?: string;
  mode?: 'private' | 'public';
  currentUserRole?: string; 
}

export function DiscussionBoard({ 
  projectId, 
  channelId = 'general', 
  mode = 'private', 
  currentUserRole 
}: DiscussionBoardProps) {
  const { data: session } = useSession();
  const normalizedUserRole = currentUserRole?.toUpperCase() || 'VIEWER';
  const apiBaseUrl = mode === 'public' ? '/api/public/discussions' : '/api/discussions';

  /* 建立狀態儲存使用者的輸入和 API 的回應
     記住現在正在編輯哪一則留言的 ID (null 代表沒在編輯) */
  const [editingId, setEditingId] = useState<string | null>(null);
  // 記住編輯框裡面的文字
  const [editContent, setEditContent] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [projectMembers, setProjectMembers] = useState<SuggestionDataItem[]>([]);
  // 用來在點擊回覆時，讓畫面自動捲動到輸入框
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fetchMessages = async () => {
    if (!projectId || projectId === 'undefined') return;
    try {
      const res = await fetch(`${apiBaseUrl}?projectId=${projectId}&channelId=${channelId}`);      const json = await res.json();
      setMessages(json.data || []);
    } catch (error) {
      console.error('抓取留言失敗', error);
    }
  };

  const fetchMembers = async () => {
    if (!projectId || projectId === 'undefined' || mode === 'public') return; // 公開大廳可能不需要 @ 人功能，視你的需求而定
    try {
      const res = await fetch(`/api/projects/${projectId}/members`);
      const json = await res.json();
      if (res.ok && json.members) {
        const membersList = json.members.map((m: any) => ({
          id: m.id,
          display: m.name || '未知使用者'
        }));
        setProjectMembers([
          { id: 'ALL', display: '所有人' },
          ...membersList
        ]);
      }
    } catch (error) {
      console.error('抓取成員失敗', error);
    }
  };

  // 網頁一載入時自動執行一次抓取
  useEffect(() => {
    fetchMessages();
    fetchMembers();
  }, [projectId, channelId, apiBaseUrl]);

  // 將資料給後端 API
  const handleSubmit = async () => {
    // 防呆: 如果什麼都沒打就不理他
    if (!content.trim()) return; 

    if (!session?.user?.id) {
      alert("請先登入才能留言！");
      return;
    }

    setIsLoading(true);

    const mentionRegex = /@\[(.*?)\]\((.*?)\)/g;
    const extractedMentions: string[] = [];

    const cleanContent = content.replace(mentionRegex, (match, display, id) => {
      extractedMentions.push(id);
      return `@${display}`; // 還原成純文字
    });

    // 過濾重複的 ID
    const uniqueMentions = Array.from(new Set(extractedMentions));

    try {
      const res = await fetch(`${apiBaseUrl}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId,
          content: cleanContent,
          mentions: uniqueMentions,
          channelId: channelId,
          referencedMessageId: replyingTo ? replyingTo.id : null
        }),
      });

      // API 回傳成功
      if (res.ok) {
        setContent(''); // 清空輸入框
        setReplyingTo(null); // 清空回覆狀態
        fetchMessages(); // 重新抓取一次最新留言，畫面就會自動更新
      } else {
        const errorText = await res.text();
        try {
          const err = JSON.parse(errorText);
          alert(`留言發布失敗: ${err.message}`);
        } catch (e) {
          console.error("API 回傳了非 JSON 格式:", errorText);
          alert(`留言發布失敗: 伺服器錯誤 (${res.status})`);
        }
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
    
    const mentionRegex = /@\[(.*?)\]\((.*?)\)/g;
    const extractedMentions: string[] = [];
    const cleanContent = editContent.replace(mentionRegex, (match, display, userId) => {
      extractedMentions.push(userId);
      return `@${display}`;
    });
    
    try{
      const res = await fetch(`${apiBaseUrl}/${id}`, {
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: cleanContent, mentions: extractedMentions }) 
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
      const res = await fetch(`${apiBaseUrl}/${id}`, { method: 'DELETE'}, );
      if (res.ok) {
        setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== id));
      }
    } catch (error) {
      alert('刪除過程發生錯誤')
    }
  }

  const handleReplyClick = (msg: Message) => {
    setReplyingTo(msg);
  }

  // react-mentions 的客製化樣式
  const baseSuggestionsStyle = {
    list: {
      backgroundColor: 'white',
      border: '1px solid rgba(0,0,0,0.1)',
      fontSize: 14,
      borderRadius: '0.5rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
    },
    item: {
      padding: '8px 12px',
      borderBottom: '1px solid rgba(0,0,0,0.05)',
      '&focused': {
        backgroundColor: '#eff6ff', 
      },
    },
  };

  // 發表留言區的樣式 (較高)
  const defaultStyle = {
    control: { fontSize: 14, fontWeight: 'normal' },
    '&multiLine': {
      control: { minHeight: 96 },
      highlighter: { padding: 12, border: '1px solid transparent' },
      input: {
        padding: 12,
        border: '1px solid #e2e8f0',
        borderRadius: '0.5rem',      
        outline: 'none',
      },
    },
    suggestions: baseSuggestionsStyle,
  };

  // 🌟 編輯留言區的樣式 (較矮)
  const editStyle = {
    control: { fontSize: 14, fontWeight: 'normal' },
    '&multiLine': {
      control: { minHeight: 60 },
      highlighter: { padding: 8, border: '1px solid transparent' },
      input: {
        padding: 8,
        border: '1px solid #cbd5e1', // 稍微深一點的邊框讓它有編輯中的感覺
        borderRadius: '0.375rem',      
        outline: 'none',
      },
    },
    suggestions: baseSuggestionsStyle,
  };

  return (
    <div className="max-w-3xl mx-auto mt-10 space-y-6">
      {/* --- 輸入區塊 --- */}
      <div className="p-6 border rounded-lg shadow-sm bg-white">
        <h2 className="text-xl font-bold mb-4">{mode === 'public' ? '發表評論' : '新增留言'}</h2>
        
        {replyingTo && (
          <div className="mb-3 flex items-start justify-between bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-sm text-indigo-800 animate-in fade-in slide-in-from-top-2">
            <div>
              <span className="font-bold mr-2">正在回覆 {replyingTo.users?.name || '未知使用者'}：</span>
              <span className="text-indigo-600 line-clamp-1">{replyingTo.content}</span>
            </div>
            <button 
              onClick={() => setReplyingTo(null)}
              className="text-indigo-400 hover:text-indigo-700 p-1 rounded-md transition-colors"
              title="取消回覆"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="mb-4 relative z-10 focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500 rounded-lg transition-all">
          <MentionsInput
            value={content}
            onChange={(e, newValue) => setContent(newValue)}
            style={defaultStyle}
            placeholder={replyingTo ? "寫下你的回覆... (輸入 @ 可標記成員)" : "在這裡暢所欲言... (輸入 @ 可標記成員)"}
            disabled={isLoading}
            className="w-full"
          >
            <Mention
              trigger="@"
              markup="@[__display__](__id__)"
              data={projectMembers}
              displayTransform={(id, display) => `@${display}`}
              style={{ backgroundColor: '#e0e7ff', borderRadius: '4px' }}
            />
          </MentionsInput>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={isLoading || !content.trim()}>
            {isLoading ? '傳送中...' : '發布留言'}
          </Button>
        </div>
      </div>

      {/* --- 留言列表區塊 --- */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-700">
          {mode === 'public' ? '讀者評論' : '內部討論'} ({messages?.length || 0})
        </h2>
        
        {messages?.length === 0 ? (
          <p className="text-gray-500 text-center py-4">目前還沒有討論，來搶頭香吧！</p>
        ) : (
          // 以 map 迴圈將陣列裡的每一筆資料變成一個 UI 卡片
          messages.map((msg) => {
            const currentUserId = session?.user?.id;
            const isAuthor = currentUserId === msg.authorId;
            // 判斷按鈕顯示邏輯
            const canEdit = isAuthor; // 只有本人能改
            const canDelete = isAuthor || normalizedUserRole === 'OWNER'; // 本人或管理員能刪

            // 判斷這則留言是否有回覆其他人
            const parentMsg = msg.projectMessages;

            const authorRoleBadge = msg.users?.role;

            return (
              <div key={msg.id} className="p-4 border rounded-lg bg-gray-50">
                
                {parentMsg && (
                  <div className="mb-3 ml-11 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-md border border-slate-100">
                    <Reply size={14} className="text-slate-400 shrink-0 transform scale-x-[-1]" />
                    <span className="font-semibold shrink-0">回覆 {parentMsg.users?.name || '某人'}:</span>
                    <span className="truncate opacity-80">{parentMsg.content}</span>
                  </div>
                )}

                <div className="flex justify-between items-start mb-2">
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

                        {authorRoleBadge === 'OWNER' && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-bold">主作者</span>
                        )}
                        {authorRoleBadge === 'EDITOR' && (
                          <span className="text-[10px] bg-indigo-100 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded font-bold">共同作者</span>
                        )}

                        {/* 本人徽章 */}
                        {isAuthor && !authorRoleBadge && (
                          <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-sm font-semibold">你</span>
                        )}
                      </span>

                      <span className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(msg.createdAt).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
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

                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 px-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                      onClick={() => handleReplyClick(msg)}
                      title="回覆此留言"
                    >
                      <Reply size={16} className="mr-1" />
                      <span className="text-xs font-semibold">回覆</span>
                    </Button>

                  </div>
                </div>

                {editingId === msg.id ? (
                  <div className="mt-2 ml-11">
                    <div className="mb-2 relative z-10 focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500 rounded-md transition-all flex">
                      <MentionsInput
                        value={editContent}
                        onChange={(e, newValue) => setEditContent(newValue)}
                        style={editStyle}
                        className="w-full"
                      >
                        <Mention
                          trigger="@"
                          markup="@[__display__](__id__)"
                          data={projectMembers}
                          displayTransform={(id, display) => `@${display}`}
                          style={{ backgroundColor: '#e0e7ff', borderRadius: '4px' }}
                        />
                      </MentionsInput>
                    </div>
                    <div className="flex justify-end gap-2">
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