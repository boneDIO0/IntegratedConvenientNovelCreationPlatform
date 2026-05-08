'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

// 定義章節與小說的格式 (簡化版)
interface Chapter {
  id: string;
  title: string;
  updatedAt: string;
}

interface NovelData {
  id: string;
  title: string;
  chapters: Chapter[];
}

export default function ChapterListPage() {
  const router = useRouter()
  const params = useParams()
  const novelId = params.novelId as string // 從網址抓取目前是哪本小說

  const [novel, setNovel] = useState<NovelData | null>(null)

  // 1. 網頁載入時，從 localStorage 讀取這本小說的完整資料
  useEffect(() => {
    const storedNovel = localStorage.getItem(`novel_${novelId}`)
    if (storedNovel) {
      setNovel(JSON.parse(storedNovel))
    }
  }, [novelId])

  // 2. 新增章節的邏輯
  const handleCreateChapter = () => {
    if (!novel) return

    const newChapterId = crypto.randomUUID()
    const newChapter: Chapter = {
      id: newChapterId,
      title: `第 ${novel.chapters.length + 1} 章：未命名`,
      updatedAt: new Date().toISOString()
    }

    // 更新這本小說的章節陣列
    const updatedNovel = {
      ...novel,
      chapters: [...novel.chapters, newChapter]
    }

    // 存回 localStorage
    setNovel(updatedNovel)
    localStorage.setItem(`novel_${novelId}`, JSON.stringify(updatedNovel))
  }

  // 如果還沒讀取到資料，先顯示載入中
  if (!novel) {
    return <div className="min-h-screen flex items-center justify-center">載入中...</div>
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-10">
      <div className="max-w-4xl mx-auto">
        
        {/* 頂部導覽與標題 */}
        <button 
          onClick={() => router.push('/novel_list')}
          className="text-blue-500 hover:underline mb-6 flex items-center gap-1"
        >
          ← 回到作品庫
        </button>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{novel.title}</h1>
          <button 
            onClick={handleCreateChapter}
            className="bg-green-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-green-700 transition-all"
          >
            + 新增章節
          </button>
        </div>

        {/* 章節列表區 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {novel.chapters.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              這本小說還沒有任何章節，點擊右上角新增吧！
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {novel.chapters.map((chapter) => (
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