'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import NovelCard from '@/components/NovelCard'

// 定義大廳專用的資料格式 (多包含了作者 owner 資訊)
export interface PublicProjectItem {
  id: string;
  title: string;
  createdAt: string;
  coverUrl?: string;
  status: string;
  owner: {
    name: string | null;
    image: string | null;
  };
}

export default function ExplorePage() {
  const router = useRouter()
  const [projects, setProjects] = useState<PublicProjectItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPublicProjects = async () => {
      try {
        const res = await fetch('/api/public/projects')
        if (!res.ok) throw new Error('載入失敗')
        const data = await res.json()
        setProjects(data)
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchPublicProjects()
  }, [])

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">載入中...</div>
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-800 font-sans p-10 relative">
      <div className="max-w-6xl mx-auto mb-10">
        <h1 className="text-3xl font-bold text-gray-900">探索大廳</h1>
        <p className="text-gray-500 mt-2">發現平台上的精采好書，尋找下一個閱讀靈感。</p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {projects.length === 0 ? (
          <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed border-gray-300 rounded-xl">
            目前大廳還沒有公開的作品，敬請期待！
          </div>
        ) : (
          projects.map((project) => (
            <NovelCard 
              key={project.id}
              project={project}
              // 📍 核心差異 1：點擊後導向「公開閱讀頁」，而不是「編輯後台」
              onClick={() => router.push(`/explore/${project.id}`)}
              // 📍 核心差異 2：讀者不能點右鍵刪除別人的書，所以把事件攔截掉
              onContextMenu={(e) => e.preventDefault()}
            />
          ))
        )}
      </div>
    </div>
  )
}