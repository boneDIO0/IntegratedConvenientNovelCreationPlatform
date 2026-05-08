'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Editor from '@/components/Editor'

import { SettingsPanel } from '@/components/SettingsPanel'

export default function ChapterEditorPage() {
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
      <div className="bg-white border-b px-6 py-2 flex items-center gap-4 shrink-0 z-50">
        <button 
          onClick={() => router.push(`/novel_list/${novelId}`)}
          className="text-gray-500 hover:text-blue-600 text-sm font-medium transition-colors"
        >
          ← 返回章節列表
        </button>
      </div>

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
          <div className="p-4 flex flex-col items-center justify-center h-full text-gray-400 border-2 border-dashed border-gray-300 m-4 rounded-lg">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">詳細設定區</h3>
            <SettingsPanel/>
          </div>
        </div>

      </div>
    </div>
  )
}