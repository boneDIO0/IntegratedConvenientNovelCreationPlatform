'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import NovelSetting from '@/components/NovelSetting'

interface ProjectIndexItem {
  id: string;
  title: string;
  createdAt: string; 
  coverUrl?: string; 
}

export default function NovelListPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectIndexItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 狀態管理：右鍵選單、刪除彈窗
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, projectId: null as string | null })
  const [deleteModal, setDeleteModal] = useState({ visible: false, projectId: null as string | null })
  
  // 狀態管理：整合後的共用表單彈窗
  const [formModal, setFormModal] = useState({
    isOpen: false,
    mode: 'create' as 'create' | 'edit',
    projectId: null as string | null,
    initialTitle: '',
    initialCoverUrl: ''
  })

  const fetchProjects = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/projects')
      if (res.status === 401) {
        alert("請先登入！")
        return
      }
      const data = await res.json()
      setProjects(data)
    } catch (error) {
      console.error("載入失敗", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
    const handleClickOutside = () => setContextMenu({ visible: false, x: 0, y: 0, projectId: null })
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [])

  const handleModalSubmit = async (title: string, file: File | null) => {
    // 統一使用 FormData 處理文字與圖片
    const formData = new FormData()
    formData.append('title', title)
    if (file) formData.append('cover', file)

    if (formModal.mode === 'create') {
      const res = await fetch('/api/projects', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('新增失敗')
      
      const newProject = await res.json()
      router.push(`/novel_list/${newProject.id}`)
    } else if (formModal.mode === 'edit' && formModal.projectId) {
      // 編輯模式也改用 FormData 傳送，不要設定 Content-Type
      const res = await fetch(`/api/projects/${formModal.projectId}`, {
        method: 'PATCH',
        body: formData 
      })
      if (!res.ok) throw new Error('修改失敗')
      
      fetchProjects()
    }
  }

  const handleContextMenu = (e: React.MouseEvent, projectId: string) => {
    e.preventDefault() 
    setContextMenu({ visible: true, x: e.pageX, y: e.pageY, projectId: projectId })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteModal.projectId) return
    try {
      await fetch(`/api/projects/${deleteModal.projectId}`, { method: 'DELETE' })
      setDeleteModal({ visible: false, projectId: null })
      fetchProjects() 
    } catch (error) {
      alert("刪除失敗")
    }
  }

  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">載入中...</div>
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-800 font-sans p-10 relative">
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">我的作品庫</h1>
          <p className="text-gray-500 mt-2">選擇一本小說開始撰寫，或點擊右鍵進行管理。</p>
        </div>
        <button 
          onClick={() => setFormModal({ isOpen: true, mode: 'create', projectId: null, initialTitle: '', initialCoverUrl: '' })}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-full font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95 flex items-center gap-2"
        >
          <span className="text-xl leading-none">+</span> 新增小說
        </button>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {projects.length === 0 ? (
          <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed border-gray-300 rounded-xl">
            目前還沒有作品，點擊右上角開始你的第一本小說吧！
          </div>
        ) : (
          projects.map((project) => (
            <div 
              key={project.id}
              onClick={() => router.push(`/novel_list/${project.id}`)}
              onContextMenu={(e) => handleContextMenu(e, project.id)}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-blue-400 transition-all cursor-pointer group flex flex-col overflow-hidden"
            >
              <div className="w-full aspect-[3/4] relative bg-gray-100 border-b border-gray-100 overflow-hidden flex items-center justify-center">
                {project.coverUrl ? (
                  <Image 
                    src={project.coverUrl} 
                    alt={project.title}
                    fill
                    unoptimized
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  />
                ) : (
                  <span className="text-gray-400 font-medium tracking-widest">NO COVER</span>
                )}
              </div>
              
              <div className="p-4 flex flex-col flex-1 bg-white">
                <h2 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {project.title}
                </h2>
                <div className="mt-auto pt-2">
                  <span className="text-xs text-gray-400">建立於：{formatDate(project.createdAt)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 使用引入的共用彈窗元件 */}
      <NovelSetting 
        isOpen={formModal.isOpen}
        mode={formModal.mode}
        initialTitle={formModal.initialTitle}
        onClose={() => setFormModal({ ...formModal, isOpen: false })}
        onSubmit={handleModalSubmit}
      />

      {contextMenu.visible && (
        <div 
          className="absolute bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50 w-32"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button 
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
            onClick={(e) => {
              e.stopPropagation()
              const targetNovel = projects.find(n => n.id === contextMenu.projectId)
              setFormModal({ 
                isOpen: true, 
                mode: 'edit', 
                projectId: contextMenu.projectId, 
                initialTitle: targetNovel?.title || '',
                initialCoverUrl: targetNovel?.coverUrl || '' // 👈 把原本的封面傳給彈窗顯示
              })
              setContextMenu({ visible: false, x: 0, y: 0, projectId: null })
            }}
          >
            小說設定
          </button>
          <button 
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation()
              setDeleteModal({ visible: true, projectId: contextMenu.projectId })
              setContextMenu({ visible: false, x: 0, y: 0, projectId: null })
            }}
          >
            刪除作品
          </button>
        </div>
      )}

      {deleteModal.visible && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setDeleteModal({...deleteModal, visible: false})}>
          <div className="bg-white p-6 rounded-xl w-96 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-2 text-red-600">確定要刪除嗎？</h2>
            <p className="text-gray-600 mb-6">此動作將把作品移至垃圾桶，確定要繼續嗎？</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteModal({...deleteModal, visible: false})} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">取消</button>
              <button onClick={handleDeleteConfirm} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium">確認刪除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}