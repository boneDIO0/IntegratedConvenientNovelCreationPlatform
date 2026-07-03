'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

export interface NovelSettingProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialTitle?: string;
  initialCoverUrl?: string;
  initialStatus?: string; // 📍 新增：用來接收小說當前的狀態
  onClose: () => void;
  // 📍 更新：送出時一併把新狀態傳出去
  onSubmit: (title: string, file: File | null, status?: string) => Promise<void>; 
}

export default function NovelSetting({ 
  isOpen, 
  mode, 
  initialTitle = '', 
  initialCoverUrl = '', 
  initialStatus = 'DRAFT',
  onClose, 
  onSubmit 
}: NovelSettingProps) {
  const [title, setTitle] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [status, setStatus] = useState('DRAFT') // 📍 新增內部狀態
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle)
      setCoverFile(null)
      setCoverPreview(initialCoverUrl || null)
      setStatus(initialStatus || 'DRAFT')
      setIsSubmitting(false)
    }
  }, [isOpen, initialTitle, initialCoverUrl, initialStatus])

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
      await onSubmit(title, coverFile, status) // 📍 送出時帶上 status
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={!isSubmitting ? onClose : undefined}>
      <div className="bg-white p-8 rounded-2xl w-[400px] shadow-2xl" onClick={e => e.stopPropagation()}>
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
  )
}