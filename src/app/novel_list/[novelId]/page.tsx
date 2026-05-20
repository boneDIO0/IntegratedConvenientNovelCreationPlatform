'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

interface Chapter {
  id: string;
  title: string;
  updatedAt: string;
}

export default function ChapterListPage() {
  const router = useRouter()
  const params = useParams()
  const novelId = params.novelId as string

  const [novelTitle, setNovelTitle] = useState('載入中...')
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
  }, [novelId])

  // 新增章節的邏輯
  const handleCreateChapter = async () => {
    try {
      const res = await fetch(`/api/projects/${novelId}/chapters`, { method: 'POST' })
      if (!res.ok) throw new Error("新增失敗")
      const newChapter = await res.json()
      
      // 新增後重新整理列表
      fetchData()
      
      // 或者直接跳轉到編輯器
      // router.push(`/novel_list/${novelId}/editor/${newChapter.id}`)
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

            {/* 原本的新增章節按鈕 */}
            <button 
              onClick={handleCreateChapter}
              className="bg-green-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-green-700 transition-all"
            >
              + 新增章節
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {chapters.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              這本小說還沒有任何章節，點擊右上角新增吧！
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
                  <button className="text-sm bg-blue-100 text-blue-600 px-3 py-1 rounded hover:bg-blue-200">
                    進入編輯 ➜
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}