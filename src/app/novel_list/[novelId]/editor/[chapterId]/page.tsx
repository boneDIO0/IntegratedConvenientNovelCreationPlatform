'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Editor from '@/components/Editor'

import { SettingsPanel } from '@/components/SettingsPanel'
import { DiscussionBoard } from '@/components/DiscussionBoard'
import { VersionsPanel } from '@/components/VersionsPanel'

export default function ChapterEditorPage() {
  
  // 建立要記住全螢幕顯示什麼的狀態，'none' 代表沒開，'discussion' 代表開討論區，'version' 代表開版本控制
  const [activeOverlay, setActiveOverlay] = useState<'none' | 'discussion' | 'version'>('none');

  const params = useParams()
  const router = useRouter()
  // 從網址列抓取小說 ID 和章節 ID
  const novelId = params.novelId as string
  const chapterId = params.chapterId as string

  const [initialData, setInitialData] = useState<{title: string, content: any} | null>(null)

  useEffect(() => {
    // 進入網頁時，去 localStorage 找到這本書的這個章節
    const rawData = localStorage.getItem(`novel_${novelId}`)
    if (rawData) {
      const novel = JSON.parse(rawData)
      const chapter = novel.chapters.find((c: any) => c.id === chapterId)
      
      if (chapter) {
        setInitialData({
          title: chapter.title,
          content: chapter.content || '<p>開始你的創作...</p>'
        })
      }
    }
  }, [novelId, chapterId])

  if (!initialData) return <div className="min-h-screen flex items-center justify-center">載入中...</div>

  return (
    <div className="h-screen bg-[#f8f9fa] flex flex-col overflow-hidden">
      {/* 簡單的返回列 */}
      <div className="bg-white border-b px-6 py-2 flex items-center justify-between gap-4 shrink-0 z-50">
        <button 
          onClick={() => router.push(`/novel_list/${novelId}`)}
          className="text-gray-500 hover:text-blue-600 text-sm font-medium transition-colors"
        >
          ← 返回章節列表
        </button>

        <div className="flex gap-2">
          {/* 按下按鈕，切換全螢幕狀態 */}
          <button onClick={() => setActiveOverlay('discussion')} className="px-3 py-1 bg-blue-100 rounded">💬</button>
          <button onClick={() => setActiveOverlay('version')} className="px-3 py-1 bg-purple-100 rounded">🕰️</button>
        </div>

      </div>

      {/* --- 左右分屏工作區 --- */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 召喚你剛剛升級的編輯器，並把資料傳給它 */}
        <div className="w-[50%] h-full flex flex-col border-r border-gray-300 relative bg-white">
          <Editor 
            novelId={novelId} 
            chapterId={chapterId} 
            initialTitle={initialData.title}
            initialContent={initialData.content}
          />
        </div>

        {/* 這是設定集 */}
        <div className="w-[50%] h-full bg-[#f4f5f7] flex flex-col overflow-y-auto">          
          <div className="flex flex-col items-center ">
            <h3 className="text-2xl font-bold text-gray-800 mb-2 ">詳細設定區</h3>
            <SettingsPanel/>
          </div>
        </div>
      </div>

      {/* 只有當 activeOverlay 不是 'none' 的時候，才會渲染這塊佔滿全螢幕的 div */}
      {activeOverlay !== 'none' && (
        <div className="absolute inset-0 z-50 bg-white flex flex-col animate-in fade-in slide-in-from-bottom-4">
          
          {/* 全螢幕的頂部：標題與叉叉按鈕 */}
          <div className="flex justify-between items-center p-4 border-b bg-gray-50 shadow-sm">
            <h2 className="text-xl font-bold">
              {activeOverlay === 'discussion' ? '討論區' : '版本控制'}
            </h2>
            {/* 按下叉叉使狀態設回 'none'，畫面會切換回編輯器 */}
            <button 
              onClick={() => setActiveOverlay('none')}
              className="p-2 hover:bg-gray-200 rounded-full font-bold text-gray-600"
            >
              ✕ 關閉
            </button>
          </div>

          {/* 全螢幕的內容區：把你的 Component 塞進來 */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
            {activeOverlay === 'discussion' && <DiscussionBoard />}
            {activeOverlay === 'version' && <VersionsPanel />}
          </div>

        </div>
      )}


    </div>
  )
}