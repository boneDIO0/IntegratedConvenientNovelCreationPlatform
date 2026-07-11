'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'

// 定義回傳的資料型別
interface PublicChapter {
  id: string;
  title: string;
  publishedAt: string | null;
}

interface PublicProjectDetail {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  status: string;
  owner: {
    name: string | null;
    image: string | null;
  };
  chapters: PublicChapter[];
}

export default function PublicNovelDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [novel, setNovel] = useState<PublicProjectDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchNovelDetail = async () => {
      try {
        const res = await fetch(`/api/public/projects/${id}`)
        if (!res.ok) {
          if (res.status === 404) throw new Error('這本小說不存在或尚未公開。')
          throw new Error('讀取小說資料失敗。')
        }
        const data = await res.json()
        setNovel(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    if (id) fetchNovelDetail()
  }, [id])

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">載入中...</div>
  if (error) return <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] text-red-500 font-bold">{error}</div>
  if (!novel) return null

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-800 font-sans pb-20 pt-12">
      
      {/* 🌟 修改 1：移除了原本這裡的 sticky 返回大廳 Navbar */}

      <div className="max-w-5xl mx-auto px-6">
        
        {/* 區塊 1：小說基本資訊 (Hero Section) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col md:flex-row gap-8 mb-10">
          {/* 封面圖 */}
          <div className="w-full md:w-64 h-80 bg-gray-100 rounded-xl overflow-hidden shrink-0 relative border border-gray-200 shadow-inner">
            {novel.coverUrl ? (
              <Image 
                src={novel.coverUrl} 
                alt={novel.title} 
                fill 
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <span className="text-4xl mb-2">📖</span>
                <span className="text-sm font-medium">暫無封面</span>
              </div>
            )}
          </div>

          {/* 文字資訊區 */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${novel.status === 'COMPLETED' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                {novel.status === 'COMPLETED' ? '已完結' : '連載中'}
              </span>
            </div>
            
            <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">{novel.title}</h1>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-purple-100 overflow-hidden flex items-center justify-center text-purple-700 font-bold border border-purple-200">
                {novel.owner.image ? (
                  <Image src={novel.owner.image} alt="author" width={32} height={32} />
                ) : (
                  novel.owner.name?.charAt(0) || '作'
                )}
              </div>
              <span className="text-gray-600 font-medium">{novel.owner.name || '匿名作者'}</span>
            </div>

            <div className="bg-gray-50 rounded-xl p-5 flex-1 border border-gray-100">
              <h3 className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">作品簡介</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {novel.description || '作者很神秘，什麼都沒有寫...'}
              </p>
            </div>
          </div>
        </div>

        {/* 區塊 2：章節目錄 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-8 py-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">章節目錄</h2>
            <span className="text-sm text-gray-500 font-medium">共 {novel.chapters.length} 章</span>
          </div>
          
          {novel.chapters.length === 0 ? (
            <div className="p-16 text-center text-gray-400 font-medium">
              作者尚未發布任何章節，請耐心等候更新！
            </div>
          ) : (
            // 🌟 修改 2：移除 grid-cols-2 的雙欄設計，改為單欄 (flex-col)，並讓按鈕邊界貼齊 (無左右 padding)
            <div className="flex flex-col">
              {novel.chapters.map((chapter, index) => (
                <div 
                  key={chapter.id}
                  onClick={() => router.push(`/explore/${id}/${chapter.id}`)}
                  // 修改樣式：將原本的 rounded-xl 拿掉，改用 border-b，並讓左右 padding (px) 填滿空間
                  className="flex items-center justify-between px-8 py-5 hover:bg-blue-50 cursor-pointer group transition-colors border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    <span className="text-gray-400 font-mono text-sm w-6 text-right shrink-0">
                      {index + 1}.
                    </span>
                    <span className="text-gray-700 font-medium group-hover:text-blue-700 truncate transition-colors text-lg">
                      {chapter.title || '未命名章節'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-400 shrink-0">
                    {chapter.publishedAt ? new Date(chapter.publishedAt).toLocaleDateString() : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}