'use client'

import { useEditorUI } from '@/contexts/EditorUIContext';
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

interface Chapter {
  id: string;
  title: string;
  updatedAt: string;
  status?: string; // 📍 補上 status 型別，這樣 TypeScript 才會認得
}

export default function ChapterListPage() {
  const router = useRouter()
  const params = useParams()
  const novelId = params.novelId as string
  const { isEditable } = useEditorUI();

  const [novelTitle, setNovelTitle] = useState('載入中...')
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 根據章節狀態回傳對應的 UI 標籤
  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case 'PUBLISHED':
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
            已公開
          </span>
        );
      case 'HIDDEN':
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700 border border-red-200">
            已隱藏
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600 border border-gray-200">
            草稿
          </span>
        );
    }
  };

  // 從 API 獲取資料
  const fetchData = async () => {
    try {
      const res = await fetch(`/api/projects/${novelId}/chapters`)
      if (!res.ok) throw new Error("讀取失敗")
      const data = await res.json()
      setNovelTitle(data.novelTitle)
      setChapters(data.chapters)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  // 🌟 修正處：明確使用區塊語法包裹，防止 TS 將特定變數誤判為 Boolean 簽章呼叫
  useEffect(() => {
    if (novelId) {
      fetchData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [novelId])

  // 新增章節的邏輯
  const handleCreateChapter = async () => {
    try {
      const res = await fetch(`/api/projects/${novelId}/chapters`, { method: 'POST' })
      if (!res.ok) throw new Error("新增失敗")
      
      // 新增後重新整理列表
      fetchData()
      
    } catch (error) {
      alert("新增章節失敗")
    }
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">載入中...</div>
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-10">
      <div className="max-w-4xl mx-auto">

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{novelTitle}</h1>
          
          {/* 按鈕群組 */}
          <div className="flex items-center gap-3">
            {/* 通往全螢幕設定集的按鈕 */}
            <button 
              onClick={() => router.push(`/novel_list/${novelId}/settings`)}
              className="border border-green-600 text-green-600 px-5 py-2 rounded-lg font-bold hover:bg-green-50 transition-all flex items-center gap-2"
            >
              ⚙️ 作品設定集
            </button>

            {/* 新增章節按鈕，僅在可編輯時顯示 */}
            {isEditable && (
              <button 
                onClick={handleCreateChapter}
                className="bg-green-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-green-700 transition-all"
              >
                + 新增章節
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {chapters.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              {isEditable
              ? "這本小說還沒有任何章節，點擊右上角新增吧！"
              : "這本小說目前還沒有任何章節。"}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {chapters.map((chapter) => (
                <div 
                  key={chapter.id}
                  className="p-5 hover:bg-blue-50 transition-colors flex justify-between items-center cursor-pointer group"
                  onClick={() => router.push(`/novel_list/${novelId}/editor/${chapter.id}`)}
                >
                  <span className="font-medium text-gray-800 group-hover:text-blue-600">
                    {chapter.title}
                  </span>
                  
                  {/* 📍 這裡！用狀態徽章取代了原本的按鈕 */}
                  <div>
                    {renderStatusBadge(chapter.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}