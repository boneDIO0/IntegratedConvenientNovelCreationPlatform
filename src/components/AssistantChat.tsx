// src/components/AssistantChat.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Trash2, Sparkles, Bot, User } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
interface AssistantChatProps {
  projectId: string;
}
export default function AssistantChat({ projectId }: AssistantChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
    // 🌟 2. 根據 projectId 動態生成唯一的儲存 Key
  const storageKey = `novel_assistant_chats_${projectId}`;
  // 🎯 1. 組件掛載時，從 LocalStorage 讀取歷史紀錄
  // 🎯 3. 當組件掛載或 projectId 切換時，讀取該專案專屬的歷史紀錄
  useEffect(() => {
    const savedMessages = localStorage.getItem(storageKey);
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error('Failed to parse cached chats', e);
      }
    } else {
      // 如果切換到新專案且沒有歷史紀錄，就清空畫面，避免留著上一個專案的殘留
      setMessages([]);
    }
  }, [storageKey]); // 🌟 注意：當切換專案（storageKey 改變）時，自動重新載入！

  // 🎯 4. 當對話更新時，同步寫回該專案專屬的 LocalStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, storageKey]);

  // 自動捲動到最新訊息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // 🎯 3. 清空歷史紀錄（大洗白）
  const handleClearHistory = () => {
    if (window.confirm('確定要清空「此專案」與 AI 助理的所有對話紀錄嗎？')) {
      localStorage.removeItem(storageKey);
      setMessages([]);
    }
  };

  // 🎯 4. 發送訊息給後端 API
  const handleSendMessage = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId, // 🚀 順便把 projectId 丟給後端！後端 RAG 才知道要去撈「哪一個專案」的設定集！
          history: [...messages, userMessage], 
        }),
      });
      if (response.status === 429) {
        const errData = await response.json();
    
    // 狀況 A：使用者自己按太快 (RATE_LIMIT_LOCAL)
      if (errData.code === 'RATE_LIMIT_LOCAL') {
        const resetTimeHeader = response.headers.get('X-RateLimit-Reset');
        let secondsLeft = 10; // 預設防呆倒數
        
        if (resetTimeHeader) {
          secondsLeft = Math.ceil((parseInt(resetTimeHeader, 10) - Date.now()) / 1000);
        }
        
        throw new Error(`【操作過於頻繁】\n您的冷卻時間還剩 ${Math.max(1, secondsLeft)} 秒，請慢一點！`);
      }

        // 狀況 B：整組專案把 Gemini 免費額度打爆了 (RATE_LIMIT_GEMINI)
        if (errData.code === 'RATE_LIMIT_GEMINI') {
          throw new Error(`【系統提示】\n當前使用人數過多，Google API 暫時限制流量，請等待約 30~60 秒讓額度重置！`);
        }
      }
      if (!response.ok) throw new Error('AI 助理突然斷線了...');

      const data = await response.json();
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.reply || '暫無回應',
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);
      alert(error.message || '發生未知錯誤');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* 🔮 右下角浮動發光按鈕 */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group"
        >
          <MessageSquare className="h-6 w-6 group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white animate-pulse">
            AI
          </span>
        </button>
      )}

      {/* 💬 對話視窗本體 */}
      {isOpen && (
        <div className="flex h-[550px] w-[380px] flex-col rounded-2xl border border-stone-200 bg-white shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-5">
          
          {/* 頂部 Header */}
          <div className="flex items-center justify-between rounded-t-2xl border-b border-stone-100 bg-stone-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-800">靈感創作助理</h3>
                <p className="text-[11px] text-stone-400">RAG 設定集即時聯動中</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200/60 hover:text-rose-500 transition-colors cursor-pointer"
                  title="清空對話紀錄"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200/60 hover:text-stone-700 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 訊息對話區域 */}
          <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-stone-50/30">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center p-6 space-y-2">
                <Bot className="h-10 w-10 text-stone-300" />
                <p className="text-sm font-medium text-stone-500">你好！我是你的小說智庫</p>
                <p className="text-xs text-stone-400 max-w-[240px]">
                  你可以問我任何關於設定集、劇情推進或角色關係的問題，我會幫你自動關聯已建立的設定。
                </p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {/* AI 頭像 */}
                  {msg.role === 'assistant' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  {/* 泡泡對話框 */}
                  <div
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-none'
                        : 'bg-white border border-stone-100 text-stone-800 rounded-tl-none'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>

                  {/* 使用者頭像 */}
                  {msg.role === 'user' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-200 text-stone-600 shadow-sm">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))
            )}
            
            {/* 讀取中（AI 思考中）動畫 */}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm animate-pulse">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="max-w-[75%] rounded-2xl rounded-tl-none bg-white border border-stone-100 px-4 py-3 text-sm shadow-sm">
                  <div className="flex gap-1 items-center h-4">
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500" />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500 [animation-delay:0.2s]" />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500 [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 底部輸入框 */}
          <form
            onSubmit={handleSendMessage}
            className="border-t border-stone-100 bg-white p-3 rounded-b-2xl flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder="向助理詢問設定或尋找靈感..."
              className="flex-grow rounded-xl border border-stone-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-stone-50 transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-stone-100 disabled:text-stone-400 transition-colors cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

        </div>
      )}
    </div>
  );
}