"use client";

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Editor from '@/components/Editor'
import { useEditorUI } from '@/contexts/EditorUIContext'
import { SettingsPanel } from '@/components/SettingsPanel'
import { RotateCcw, Trash2, X, History } from "lucide-react"

export default function ChapterEditorPage() {
  
  const {
      isSettingsOpen,
      activeOverlay,
      setActiveOverlay,
      versions,
      setVersions,
      setLatestRestoredContent,
      fetchVersions, // 🌟 Context 提供的撈取歷史版本函式
      isLoadingVersions,
      isEditable
    } = useEditorUI(); // 📍 修正：移除了底下重複宣告的 fetchVersions 與 isLoadingVersions

  const params = useParams()
  const novelId = params.novelId as string
  const chapterId = params.chapterId as string

  // 📍 狀態定義
  const [initialData, setInitialData] = useState<{title: string, content: any, status: string} | null>(null)

  useEffect(() => {
    const fetchChapterData = async () => {
      try {
        const res = await fetch(`/api/projects/${novelId}/chapters/${chapterId}`)
        if (!res.ok) throw new Error("讀取章節失敗")
        
        const chapter = await res.json()
        const isEmptyContent = !chapter.content || Object.keys(chapter.content).length === 0
        
        setInitialData({
          title: chapter.title,
          content: isEmptyContent ? '<p>開始你的創作...</p>' : chapter.content,
          status: chapter.status || 'DRAFT' // 📍 撈取資料庫的章節狀態
        })
      } catch (error) {
        console.error(error)
        alert("無法載入章節資料，請回上一頁重試！")
      }
    }

    if (novelId && chapterId) {
      fetchChapterData();
      fetchVersions(novelId, chapterId); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [novelId, chapterId]) 

  const handleRestoreVersion = async (versionId: string) => {
    if (!confirm("確定要將內文還原至此版本嗎？現有未存檔的修改將會被覆蓋。")) return;

    try {
      const res = await fetch(`/api/projects/${novelId}/chapters/${chapterId}/versions/${versionId}`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setLatestRestoredContent(data.content);
        setActiveOverlay('none'); 
        alert("章節內容已成功倒滾還原！");
      } else {
        alert("還原失敗，請稍後再試");
      }
    } catch (error) {
      console.error("還原請求出錯:", error);
      alert("伺服器發生錯誤，請稍後再試");
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    if (!confirm("確定要抹除這筆歷史紀錄嗎？此動作無法復原。")) return;

    try {
      const res = await fetch(`/api/projects/${novelId}/chapters/${chapterId}/versions/${versionId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setVersions(versions.filter((v) => v.id !== versionId));
      } else {
        alert("刪除失敗");
      }
    } catch (error) {
      console.error("刪除請求出錯:", error);
    }
  };

  if (!initialData) return <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium">載入中...</div>

  return (
    <div className="h-[calc(100vh-3.5rem)] w-full bg-[#f8f9fa] flex flex-col overflow-hidden relative">
      <div className="flex-1 flex overflow-hidden relative w-full">
        
        {/* 編輯器主要區塊 */}
        <div className={`${isSettingsOpen ? 'w-[55%]' : 'w-full'} h-full flex flex-col border-r transition-all duration-300 min-w-0`}>
          <Editor
            novelId={novelId}
            chapterId={chapterId}
            initialTitle={initialData.title}
            initialContent={initialData.content}
            isEditable={true}
            initialStatus={initialData.status} 
          />
        </div>

        {/* 設定面板區塊 */}
        {isSettingsOpen && (
          <div className="w-[45%] h-full bg-[#f4f5f7] flex flex-col overflow-y-auto border-l border-slate-200">
            <div className="flex flex-col items-center p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">詳細設定區</h3>
              <SettingsPanel 
                projectId={novelId} 
                chapterId={chapterId} 
              />
            </div>
          </div>
        )}

        {/* 歷史紀錄側邊欄 */}
        {activeOverlay === 'version' && (
          <aside className="fixed right-0 top-14 h-[calc(100vh-56px)] w-80 bg-white border-l border-slate-200 z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <header className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <History size={18} className="text-purple-600" /> 版本歷史時光機
              </h4>
              <button
                onClick={() => setActiveOverlay('none')}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
              {isLoadingVersions ? (
                <p className="text-sm text-slate-400 text-center mt-6 animate-pulse">從資料庫載入中...</p>
              ) : versions.length === 0 ? (
                <p className="text-sm text-slate-400 text-center mt-6">目前此章節尚無任何歷史版本點。</p>
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
                          className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors font-medium"
                        >
                          <RotateCcw size={12} /> 還原
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteVersion(ver.id)}
                          className="flex items-center gap-1 text-xs bg-red-50 text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-100 transition-colors font-medium"
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