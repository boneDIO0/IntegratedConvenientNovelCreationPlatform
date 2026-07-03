"use client";

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Editor from '@/components/Editor'
import { useEditorUI } from '@/contexts/EditorUIContext'

import { SettingsPanel } from '@/components/SettingsPanel'
import { RotateCcw, Trash2, X, History } from "lucide-react"

export default function ChapterEditorPage() {
  
  // 設定集 和 版本管理 開關狀態
  const {
      isSettingsOpen,
      activeOverlay,
      setActiveOverlay,
      versions,
      setVersions,
      latestRestoredContent,
      setLatestRestoredContent,
      fetchVersions, // 🌟 Context 提供的撈取歷史版本函式
      isLoadingVersions,
      isEditable
    } = useEditorUI();

  const params = useParams()

  // 從網址列抓取小說 ID 和章節 ID
  const novelId = params.novelId as string
  const chapterId = params.chapterId as string

  const [initialData, setInitialData] = useState<{title: string, content: any} | null>(null)

  useEffect(() => {
    // 改為向雲端 API 請求這一個章節的資料
    const fetchChapterData = async () => {
      try {
        const res = await fetch(`/api/projects/${novelId}/chapters/${chapterId}`)
        if (!res.ok) throw new Error("讀取章節失敗")
        
        const chapter = await res.json()
        
        // 判斷雲端傳回來的內容是不是空的 (因為我們一開始建立時塞了空物件 {})
        const isEmptyContent = !chapter.content || Object.keys(chapter.content).length === 0
        
        setInitialData({
          title: chapter.title,
          content: isEmptyContent ? '<p>開始你的創作...</p>' : chapter.content
        })
      } catch (error) {
        console.error(error)
        alert("無法載入章節資料，請回上一頁重試！")
      }
    }

    if (novelId && chapterId) {
      // 🎬 1. 載入當前章節的編輯器內容
      fetchChapterData();
      
      // 🌟 核心修正：當切換章節時，主動呼叫全域時光機 API，秒刷當前章節的歷史版本紀錄！
      fetchVersions(novelId, chapterId); 
    }
  }, [novelId, chapterId]) // 🌟 監聽 chapterId，換章節時一併刷新

  // 🌟 2. 歷史紀錄：點擊卡片執行「還原」 (呼叫後端 POST API)
  const handleRestoreVersion = async (versionId: string) => {
    if (!confirm("確定要將內文還原至此版本嗎？現有未存檔的修改將會被覆蓋。")) return;

    try {
      const res = await fetch(`/api/projects/${novelId}/chapters/${chapterId}/versions/${versionId}`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        // 🌟 關鍵：把後端回傳的最新內文塞進 Context，通知 Tiptap 編輯器刷新
        setLatestRestoredContent(data.content);
        setActiveOverlay('none'); // 還原成功後關閉側邊欄
        alert("章節內容已成功倒滾還原！");
      } else {
        alert("還原失敗，請稍後再試");
      }
    } catch (error) {
      console.error("還原請求出錯:", error);
    }
  };

  // 🌟 3. 歷史紀錄：點擊卡片執行「刪除」 (呼叫後端 DELETE API)
  const handleDeleteVersion = async (versionId: string) => {
    if (!confirm("確定要抹除這筆歷史紀錄嗎？此動作無法復原。")) return;

    try {
      const res = await fetch(`/api/projects/${novelId}/chapters/${chapterId}/versions/${versionId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // 從全域狀態中即時過濾掉該筆卡片
        setVersions(versions.filter((v) => v.id !== versionId));
      } else {
        alert("刪除失敗");
      }
    } catch (error) {
      console.error("刪除請求出錯:", error);
    }
  };

  if (!initialData) return <div className="min-h-screen flex items-center justify-center">載入中...</div>

  return (
    <div className="h-[calc(100vh-3.5rem)] w-full bg-[#f8f9fa] flex flex-col overflow-hidden relative">

      {/* --- 左右分屏工作區 --- */}
      <div className="flex-1 flex overflow-hidden relative w-full">

        {/* 左側：Tiptap 編輯器畫布 */}
        <div className={`${isSettingsOpen ? 'w-[55%]' : 'w-full'} h-full flex flex-col border-r transition-all duration-300 min-w-0`}>
          <Editor
            novelId={novelId}
            chapterId={chapterId}
            initialTitle={initialData.title}
            initialContent={initialData.content}
            isEditable={true}
          />
        </div>

        {/* 右側：詳細設定區 */}
        {isSettingsOpen && (
          <div className="w-[45%] h-full bg-[#f4f5f7] flex flex-col overflow-y-auto">
            <div className="flex flex-col items-center p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">詳細設定區</h3>
              <SettingsPanel 
                projectId={novelId} 
                chapterId={chapterId} 
              />
            </div>
          </div>
        )}

        {/* 🌟 4. 側邊欄：版本歷史時光機 (當 activeOverlay === 'version' 時渲染) */}
        {activeOverlay === 'version' && (
          <aside className="fixed right-0 top-14 h-[calc(100vh-56px)] w-80 bg-white border-l border-slate-200 z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* 側邊欄標頭 */}
            <header className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <History size={18} className="text-purple-600" /> 版本歷史時光機
              </h4>
              <button
                onClick={() => setActiveOverlay('none')}
                className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </header>

            {/* 版本列表滾動區 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
              {isLoadingVersions ? (
                <p className="text-xs text-slate-400 text-center mt-6 animate-pulse">從資料庫載入中...</p>
              ) : versions.length === 0 ? (
                <p className="text-xs text-slate-400 text-center mt-6">目前此章節尚無任何歷史版本點。</p>
              ) : (
                versions.map((ver) => (
                  <div key={ver.id} className="p-3 border border-slate-200 rounded-xl bg-white shadow-sm group hover:border-purple-300 transition-colors">
                    <p className="text-xs font-semibold text-slate-500">
                      {new Date(ver.createdAt).toLocaleString()}
                    </p>
                    <p className="text-sm font-medium text-slate-700 mt-1.5 break-all">
                      {ver.commitMsg || "系統自動儲存點"}
                    </p>

                    {/* 滑鼠懸停才顯現的操作按鈕，檢視者看不到 */}
                    {isEditable && (
                      <div className="mt-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleRestoreVersion(ver.id)}
                          className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition-colors"
                        >
                          <RotateCcw size={12} /> 還原
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteVersion(ver.id)}
                          className="flex items-center gap-1 text-xs bg-red-50 text-red-600 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <Trash2 size={12} /> 刪除
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </aside>
        )}

      </div>
    </div>
  )
}