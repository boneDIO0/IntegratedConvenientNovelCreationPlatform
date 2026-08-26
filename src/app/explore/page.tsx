'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import NovelCard from '@/components/NovelCard'
import NovelPagination from '@/components/NovelPagination'

const NOVELS_PER_PAGE = 20

// 定義大廳專用的資料格式 (多包含了作者 owner 資訊)
export interface PublicProjectItem {
  id: string;
  title: string;
  createdAt: string;
  publishedAt: string | null;
  coverUrl?: string;
  status: string;
  tags: string[];
  owner: {
    name: string | null;
    image: string | null;
  };
}

interface PaginatedProjectsResponse {
  items: PublicProjectItem[];
  pagination: {
    page: number;
    totalPages: number;
  };
}

interface PublicTagsResponse {
  items: string[];
}

export default function ExplorePage() {
  const router = useRouter()
  const [projects, setProjects] = useState<PublicProjectItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  useEffect(() => {
    const fetchPublicProjects = async () => {
      setIsLoading(true)
      try {
        const searchParams = new URLSearchParams({
          page: String(currentPage),
          limit: String(NOVELS_PER_PAGE),
        })
        selectedTags.forEach((tag) => searchParams.append('tag', tag))

        const res = await fetch(`/api/public/projects?${searchParams}`)
        if (!res.ok) throw new Error('載入失敗')
        const data: PaginatedProjectsResponse = await res.json()
        setProjects(data.items)
        setTotalPages(data.pagination.totalPages)

        if (data.pagination.page !== currentPage) {
          setCurrentPage(data.pagination.page)
        }
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchPublicProjects()
  }, [currentPage, selectedTags])

  useEffect(() => {
    const fetchAvailableTags = async () => {
      try {
        const res = await fetch('/api/public/tags')
        if (!res.ok) throw new Error('載入標籤失敗')
        const data: PublicTagsResponse = await res.json()
        setAvailableTags(data.items)
      } catch (error) {
        console.error(error)
      }
    }

    fetchAvailableTags()
  }, [])

  const toggleTag = (tag: string) => {
    setSelectedTags((tags) =>
      tags.includes(tag)
        ? tags.filter((selectedTag) => selectedTag !== tag)
        : [...tags, tag]
    )
    setCurrentPage(1)
  }

  if (isLoading && projects.length === 0) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">載入中...</div>
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-800 font-sans p-10 relative">
      <div className="max-w-6xl mx-auto mb-10">
        <h1 className="text-3xl font-bold text-gray-900">探索大廳</h1>
        <p className="text-gray-500 mt-2">發現平台上的精采好書，尋找下一個閱讀靈感。</p>
      </div>

      {availableTags.length > 0 && (
        <section className="max-w-6xl mx-auto mb-6" aria-label="以標籤篩選作品">
          <div className="mb-2 flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold text-gray-700">依標籤探索</h2>
            {selectedTags.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTags([])
                  setCurrentPage(1)
                }}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                清除篩選
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => {
              const isSelected = selectedTags.includes(tag)

              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    isSelected
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-blue-100 bg-white text-blue-700 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        </section>
      )}

      <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 lg:gap-[18px]">
        {projects.length === 0 ? (
          <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed border-gray-300 rounded-xl">
            {selectedTags.length > 0
              ? '沒有符合所選標籤的公開作品。'
              : '目前大廳還沒有公開的作品，敬請期待！'}
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
              showPublishDate={true}
            />
          ))
        )}
      </div>

      <NovelPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  )
}
