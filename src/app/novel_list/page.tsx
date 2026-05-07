'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface NovelIndexItem {
  id: string;
  title: string;
  updatedAt: string;
}

export default function NovelListPage() {
  const router = useRouter()
  const [novels, setNovels] = useState<NovelIndexItem[]>([])

  // 🌟 新增：控制右鍵選單的狀態
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    novelId: null as string | null
  })

  // 🌟 新增：控制刪除彈窗與編輯彈窗的狀態
  const [deleteModal, setDeleteModal] = useState({ visible: false, novelId: null as string | null })
  const [editModal, setEditModal] = useState({ visible: false, novelId: null as string | null, newTitle: '' })

  // 網頁載入時，從 localStorage 抓取「小說目錄」
  useEffect(() => {
    const storedNovels = localStorage.getItem('novels_index')
    if (storedNovels) {
      setNovels(JSON.parse(storedNovels))
    }

    // 🌟 全域點擊監聽：點擊畫面任何地方，就關閉右鍵選單
    const handleClickOutside = () => setContextMenu({ visible: false, x: 0, y: 0, novelId: null })
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [])

  const handleCreateNovel = () => {
    const newId = crypto.randomUUID()
    const newIndexItem: NovelIndexItem = { id: newId, title: '未命名的作品', updatedAt: new Date().toISOString() }
    const updatedNovels = [newIndexItem, ...novels]
    setNovels(updatedNovels)
    localStorage.setItem('novels_index', JSON.stringify(updatedNovels))

    const fullNovelData = { id: newId, title: '未命名的作品', authorId: 'guest_user', chapters: [], savedAt: new Date().toISOString() }
    localStorage.setItem(`novel_${newId}`, JSON.stringify(fullNovelData))

    router.push(`/novel_list/${newId}`)
  }

  // 🌟 處理右鍵點擊事件
  const handleContextMenu = (e: React.MouseEvent, novelId: string) => {
    e.preventDefault() // 阻止瀏覽器預設的右鍵選單
    setContextMenu({
      visible: true,
      x: e.pageX, // 滑鼠 X 座標
      y: e.pageY, // 滑鼠 Y 座標
      novelId: novelId
    })
  }

  // 🌟 確認刪除的處理邏輯
  const handleDeleteConfirm = () => {
    if (!deleteModal.novelId) return

    // 1. 更新目錄 (拔掉這本書)
    const updatedNovels = novels.filter(n => n.id !== deleteModal.novelId)
    setNovels(updatedNovels)
    localStorage.setItem('novels_index', JSON.stringify(updatedNovels))

    // 2. 徹底銷毀實體資料
    localStorage.removeItem(`novel_${deleteModal.novelId}`)

    // 關閉彈窗
    setDeleteModal({ visible: false, novelId: null })
  }

  // 🌟 確認編輯的處理邏輯
  const handleEditConfirm = () => {
    if (!editModal.novelId || !editModal.newTitle.trim()) return

    // 1. 更新目錄的書名
    const updatedNovels = novels.map(n => 
      n.id === editModal.novelId 
        ? { ...n, title: editModal.newTitle, updatedAt: new Date().toISOString() } 
        : n
    )
    setNovels(updatedNovels)
    localStorage.setItem('novels_index', JSON.stringify(updatedNovels))

    // 2. 更新實體資料的書名
    const fullDataStr = localStorage.getItem(`novel_${editModal.novelId}`)
    if (fullDataStr) {
      const fullData = JSON.parse(fullDataStr)
      fullData.title = editModal.newTitle // 把裡面的書名也改掉
      localStorage.setItem(`novel_${editModal.novelId}`, JSON.stringify(fullData))
    }

    // 關閉彈窗
    setEditModal({ visible: false, novelId: null, newTitle: '' })
  }

  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-800 font-sans p-10 relative">
      
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">我的作品庫</h1>
          <p className="text-gray-500 mt-2">選擇一本小說開始撰寫，或點擊右鍵進行管理。</p>
        </div>
        <button 
          onClick={handleCreateNovel}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-full font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95 flex items-center gap-2"
        >
          <span className="text-xl leading-none">+</span> 新增小說
        </button>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {novels.length === 0 ? (
          <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed border-gray-300 rounded-xl">
            目前還沒有作品，點擊右上角開始你的第一本小說吧！
          </div>
        ) : (
          novels.map((novel) => (
            <div 
              key={novel.id}
              onClick={() => router.push(`/novel_list/${novel.id}`)}
              onContextMenu={(e) => handleContextMenu(e, novel.id)} // 🌟 綁定右鍵事件
              className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group flex flex-col h-48"
            >
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {novel.title}
                </h2>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded">連載中</span>
                </div>
              </div>
              
              <div className="border-t border-gray-100 pt-3 flex justify-between items-center mt-4">
                <span className="text-xs text-gray-400">
                  最後更新：{formatDate(novel.updatedAt)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 🌟 1. 自訂右鍵選單 */}
      {contextMenu.visible && (
        <div 
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="absolute z-50 w-32 bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-sm overflow-hidden"
          onClick={(e) => e.stopPropagation()} // 防止點擊選單時觸發背景的點擊事件
        >
          <button 
            onClick={() => {
              setContextMenu({ ...contextMenu, visible: false })
              const novelToEdit = novels.find(n => n.id === contextMenu.novelId)
              setEditModal({ visible: true, novelId: contextMenu.novelId, newTitle: novelToEdit?.title || '' })
            }}
            className="w-full text-left px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
          >
            編輯書名
          </button>
          <button 
            onClick={() => {
              setContextMenu({ ...contextMenu, visible: false })
              setDeleteModal({ visible: true, novelId: contextMenu.novelId })
            }}
            className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
          >
            刪除小說
          </button>
        </div>
      )}

      {/* 🌟 2. 編輯彈跳視窗 (Modal) */}
      {editModal.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 transform transition-all">
            <h3 className="text-xl font-bold text-gray-900 mb-4">重新命名小說</h3>
            <input 
              type="text" 
              value={editModal.newTitle}
              onChange={(e) => setEditModal({...editModal, newTitle: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-6 text-gray-800"
              placeholder="輸入新的書名..."
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setEditModal({ visible: false, novelId: null, newTitle: '' })}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleEditConfirm}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                儲存變更
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 3. 刪除確認彈跳視窗 (Modal) */}
      {deleteModal.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center transform transition-all">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-500 text-3xl">⚠️</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">確定要刪除嗎？</h3>
            <p className="text-gray-500 mb-6 text-sm">
              刪除後將無法復原，這本小說的所有章節都會被永遠清除。
            </p>
            <div className="flex flex-col gap-2">
              <button 
                onClick={handleDeleteConfirm}
                className="w-full py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
              >
                是的，永久刪除
              </button>
              <button 
                onClick={() => setDeleteModal({ visible: false, novelId: null })}
                className="w-full py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-bold transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}