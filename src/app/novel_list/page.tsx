'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ProjectIndexItem {
  id: string;
  title: string;
  createdAt: string; 
}

export default function NovelListPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectIndexItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 狀態管理：右鍵選單、刪除彈窗、編輯彈窗
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, projectId: null as string | null })
  const [deleteModal, setDeleteModal] = useState({ visible: false, projectId: null as string | null })
  const [editModal, setEditModal] = useState({ visible: false, projectId: null as string | null, newTitle: '' })

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

  const handleCreateProject = async () => {
    try {
      const res = await fetch('/api/projects', { method: 'POST' })
      if (!res.ok) throw new Error('新增失敗')
      const newProject = await res.json()
      router.push(`/novel_list/${newProject.id}`)
    } catch (error) {
      alert("新增作品失敗")
    }
  }

  // 🌟 觸發右鍵選單
  const handleContextMenu = (e: React.MouseEvent, projectId: string) => {
    e.preventDefault() 
    setContextMenu({ visible: true, x: e.pageX, y: e.pageY, projectId: projectId })
  }

  // 🌟 呼叫刪除 API
  const handleDeleteConfirm = async () => {
    if (!deleteModal.projectId) return
    try {
      await fetch(`/api/projects/${deleteModal.projectId}`, { method: 'DELETE' })
      setDeleteModal({ visible: false, projectId: null })
      fetchProjects() // 重新拉取資料
    } catch (error) {
      alert("刪除失敗")
    }
  }

  // 🌟 呼叫修改 API
  const handleEditConfirm = async () => {
    if (!editModal.projectId || !editModal.newTitle.trim()) return
    try {
      await fetch(`/api/projects/${editModal.projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editModal.newTitle })
      })
      setEditModal({ visible: false, projectId: null, newTitle: '' })
      fetchProjects() // 重新拉取資料
    } catch (error) {
      alert("修改失敗")
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
          onClick={handleCreateProject}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-full font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95 flex items-center gap-2"
        >
          <span className="text-xl leading-none">+</span> 新增小說
        </button>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
              className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group flex flex-col h-48"
            >
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {project.title}
                </h2>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between items-center mt-4">
                <span className="text-xs text-gray-400">建立於：{formatDate(project.createdAt)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 🌟 裝回右鍵選單 */}
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
              setEditModal({ visible: true, projectId: contextMenu.projectId, newTitle: targetNovel?.title || '' })
              setContextMenu({ visible: false, x: 0, y: 0, projectId: null })
            }}
          >
            ✏️ 修改標題
          </button>
          <button 
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation()
              setDeleteModal({ visible: true, projectId: contextMenu.projectId })
              setContextMenu({ visible: false, x: 0, y: 0, projectId: null })
            }}
          >
            🗑️ 刪除作品
          </button>
        </div>
      )}

      {/* 🌟 裝回編輯彈窗 */}
      {editModal.visible && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEditModal({...editModal, visible: false})}>
          <div className="bg-white p-6 rounded-xl w-96 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">修改小說標題</h2>
            <input 
              type="text" 
              value={editModal.newTitle}
              onChange={(e) => setEditModal({...editModal, newTitle: e.target.value})}
              className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-blue-500 mb-6"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditModal({...editModal, visible: false})} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">取消</button>
              <button onClick={handleEditConfirm} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium">儲存修改</button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 裝回刪除彈窗 */}
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