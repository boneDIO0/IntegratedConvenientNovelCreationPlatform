// 檔案路徑：src/contexts/OverlayContext.tsx
"use client"

import React, { createContext, useContext, useState } from 'react'
import { DiscussionBoard } from '@/components/DiscussionBoard'

// 定義開關中心的規格
type OverlayContextType = {
  isDiscussionOpen: boolean;
  toggleDiscussion: () => void;
  closeDiscussion: () => void;
}

const OverlayContext = createContext<OverlayContextType | undefined>(undefined);

// 建立 Provider
export function OverlayProvider({ children }: { children: React.ReactNode }) {
  const [isDiscussionOpen, setIsDiscussionOpen] = useState(false);

  const toggleDiscussion = () => setIsDiscussionOpen(prev => !prev);
  const closeDiscussion = () => setIsDiscussionOpen(false);

  return (
    <OverlayContext.Provider value={{ isDiscussionOpen, toggleDiscussion, closeDiscussion }}>
      {/* 這裡是網站原本的所有內容 */}
      {children}

      {/* 全螢幕討論區 */}
      {isDiscussionOpen && (
        <div className="fixed inset-0 z-[9999] bg-white flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center p-4 border-b bg-slate-50">
            <h2 className="text-xl font-bold">討論區</h2>
            <button 
              onClick={closeDiscussion}
              className="p-2 hover:bg-slate-200 rounded-full font-bold text-slate-600"
            >
              ✕ 關閉
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <DiscussionBoard />
          </div>
        </div>
      )}
    </OverlayContext.Provider>
  )
}

// 專屬的 Hook，讓其他元件方便呼叫
export function useOverlay() {
  const context = useContext(OverlayContext);
  if (!context) throw new Error("useOverlay 必須在 OverlayProvider 內使用");
  return context;
}