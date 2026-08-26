'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { NOVEL_TAGS, MAX_NOVEL_TAGS } from '@/lib/novelTags'

export interface NovelSettingProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialTitle?: string;
  initialCoverUrl?: string;
  initialDescription?: string;
  initialStatus?: string; // 📍 新增：用來接收小說當前的狀態
  initialTags?: string[];
  onClose: () => void;
  // 送出小說名稱、封面、作品簡介、狀態與標籤
  onSubmit: (title: string, file: File | null, description: string, status?: string, tags?: string[]) => Promise<void>; 
}

export default function NovelSetting({ 
  isOpen, 
  mode, 
  initialTitle = '', 
  initialCoverUrl = '', 
  initialDescription = '',
  initialStatus = 'DRAFT',
  initialTags = [],
  onClose, 
  onSubmit 
}: NovelSettingProps) {
  const [title, setTitle] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('DRAFT') // 📍 新增內部狀態
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle)
      setCoverFile(null)
      setCoverPreview(initialCoverUrl || null)
      setDescription(initialDescription || '')
      setStatus(initialStatus || 'DRAFT')
      setSelectedTags(initialTags || [])
      setIsSubmitting(false)
    }
  }, [isOpen, initialTitle, initialCoverUrl, initialDescription, initialStatus, initialTags])

  if (!isOpen) return null

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCoverFile(file)
      setCoverPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert("請輸入小說名稱")
      return
    }
    setIsSubmitting(true)
    try {
      await onSubmit(title, coverFile, description, status, selectedTags)
      onClose()
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isCreate = mode === 'create'
  
  // 📍 核心判斷：如果是編輯模式，且狀態不是未公開(DRAFT)，才顯示完結選項
  const showCompletedCheckbox = !isCreate && initialStatus !== 'DRAFT'

  return (
    <div
      className="fixed inset-0 z-[1100] bg-black/50 p-4 overflow-y-auto"
      onClick={!isSubmitting ? onClose : undefined}
    >
      <div className="min-h-full flex items-center justify-center">
        <div
          className="bg-white p-8 rounded-2xl w-[400px] max-w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          {isCreate ? '新增小說' : '小說設定'}
        </h2>
        
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">小說名稱</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              placeholder="輸入你的偉大書名..."
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">作品簡介</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-28 border border-gray-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-y"
              placeholder="簡單介紹故事背景、主角或作品特色..."
            />
            <p className="text-xs text-gray-400 mt-1">公開作品頁與作品卡片會顯示這段簡介。</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">小說標籤</label>
              <span className="text-xs text-gray-400">最多 {MAX_NOVEL_TAGS} 個（已選 {selectedTags.length}）</span>
            </div>
            <div className="flex flex-wrap gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
              {NOVEL_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag)
                const isDisabled = !isSelected && selectedTags.length >= MAX_NOVEL_TAGS

                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setSelectedTags((current) => {
                        if (current.includes(tag)) {
                          return current.filter((item) => item !== tag)
                        }
                        if (current.length >= MAX_NOVEL_TAGS) {
                          return current
                        }
                        return [...current, tag]
                      })
                    }}
                    disabled={isDisabled}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                    } ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">可以複選最符合小說內容的標籤。</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">封面圖片 (3:4)</label>
            <div className="flex flex-col items-center gap-3">
              <div className="w-32 aspect-[3/4] bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative">
                {coverPreview ? (
                  <Image src={coverPreview} alt="Preview" fill unoptimized className="object-cover" />
                ) : (
                  <span className="text-xs text-gray-400">預覽區</span>
                )}
              </div>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleImageChange}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>

          {/* 📍 新增：完結狀態勾選區塊 */}
          {showCompletedCheckbox && (
            <div className="pt-2">
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={status === 'COMPLETED'}
                  // 勾選變 COMPLETED，取消勾選則退回 SERIALIZING (因為它一定發布過了)
                  onChange={(e) => setStatus(e.target.checked ? 'COMPLETED' : 'SERIALIZING')}
                  className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  標記為「已完結」
                  <p className="text-xs text-gray-500 font-normal mt-0.5">
                    勾選後，讀者將會在平台上看到作品已完結的標籤。
                  </p>
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
          <button 
            onClick={onClose} 
            disabled={isSubmitting}
            className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? '處理中...' : '儲存'}
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}