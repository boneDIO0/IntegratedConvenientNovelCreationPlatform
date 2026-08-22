'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { GripVertical } from 'lucide-react'

interface Chapter {
  id: string;
  title: string;
  updatedAt: string;
  status?: string; 
  orderIndex: number;
}

export default function ChapterListPage() {
  const router = useRouter()
  const params = useParams()
  const novelId = params.novelId as string

  const [novelTitle, setNovelTitle] = useState('載入中...')
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 根據章節狀態回傳對應的 UI 標籤
  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case 'PUBLISHED':
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm">
            已公開
          </span>
        );
      case 'HIDDEN':
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700 border border-red-200 shadow-sm">
            已隱藏
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200 shadow-sm">
            草稿
          </span>
        );
    }
  };

  // 從 API 獲取資料
  const fetchData = async () => {
    try {
      const res = await fetch(`/api/projects/${novelId}/chapters`)
      if (!res.ok) throw new Error("讀取失敗")
      const data = await res.json()
      setNovelTitle(data.novelTitle)
      const sortedChapters = (data.chapters || []).sort((a: Chapter, b: Chapter) => a.orderIndex - b.orderIndex)
      setChapters(sortedChapters)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (novelId) {
      fetchData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [novelId])

  // 新增章節的邏輯
  const handleCreateChapter = async () => {
    try {
      const res = await fetch(`/api/projects/${novelId}/chapters`, { method: 'POST' })
      if (!res.ok) throw new Error("新增失敗")
      
      // 新增後重新整理列表
      fetchData()
      
    } catch (error) {
      alert("新增章節失敗")
    }
  }

  // 處理章節拖曳結束的邏輯
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source } = result;

    // 如果沒有拖曳到有效區域，或位置沒變，直接返回
    if (!destination || destination.index === source.index) return;

    // 先在前端移動陣列位置
    const newChapters = Array.from(chapters);
    const [movedChapter] = newChapters.splice(source.index, 1);
    newChapters.splice(destination.index, 0, movedChapter);

    // 演算法：計算新的 orderIndex (Fractional Indexing)
    const prevChapter = newChapters[destination.index - 1];
    const nextChapter = newChapters[destination.index + 1];

    let newOrderIndex = 0;
    
    if (!prevChapter && nextChapter) {
      // 移到最上面
      newOrderIndex = nextChapter.orderIndex - 100;
    } else if (prevChapter && !nextChapter) {
      // 移到最下面
      newOrderIndex = prevChapter.orderIndex + 100;
    } else if (prevChapter && nextChapter) {
      // 移到兩個章節中間：取平均值
      newOrderIndex = (prevChapter.orderIndex + nextChapter.orderIndex) / 2;
    } else {
      // 只有一個章節的極端情況
      newOrderIndex = 100;
    }

    // 更新剛拖曳的章節的 orderIndex，並更新畫面
    movedChapter.orderIndex = newOrderIndex;
    setChapters(newChapters);

    try {
      await fetch(`/api/projects/${novelId}/chapters/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId: movedChapter.id,
          newOrderIndex: newOrderIndex
        })
      });
    } catch (error) {
      console.error("排序儲存失敗", error);
      alert("排序同步失敗，請重新整理頁面。");
      fetchData(); // 失敗的話把畫面洗回資料庫的真實狀態
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium">載入中...</div>
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-10">
      <div className="max-w-4xl mx-auto">

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{novelTitle}</h1>
          
          {/* 按鈕群組 */}
          <div className="flex items-center gap-3">
            <a 
              href={`/api/projects/${novelId}/export?format=txt`}
              download
              className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg font-semibold hover:bg-slate-50 transition-all shadow-sm text-sm"
              title="匯出為純文字檔"
            >
              📄 TXT
            </a>
            <a 
              href={`/api/projects/${novelId}/export?format=docx`}
              download
              className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg font-semibold hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm text-sm"
              title="匯出為 Word 檔"
            >
              📘 DOCX
            </a>

            <div className="w-px h-6 bg-slate-300 mx-1"></div> {/* 分隔線 */}
            <button 
              onClick={() => router.push(`/novel_list/${novelId}/settings`)}
              className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2 shadow-sm"
            >
              ⚙️ 作品設定集
            </button>

            {/* 🌟 修正：移除了 isEditable 判斷，讓新增章節按鈕永遠顯示 */}
            <button 
              onClick={handleCreateChapter}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold shadow-sm hover:bg-blue-700 hover:shadow transition-all flex items-center gap-1"
            >
              <span className="text-lg leading-none">+</span> 新增章節
            </button>
          </div>
        </div>

        {/* 靈感記事板 page */}
        <div 
          onClick={() => router.push(`/novel_list/${novelId}/notes`)}
          className="mb-6 bg-amber-50 border-2 border-dashed border-amber-300 hover:border-amber-400 hover:bg-amber-100/60 rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all group shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center text-2xl border border-amber-200 group-hover:scale-110 transition-transform">
              💡
            </div>
            <div>
              <h3 className="font-bold text-amber-900 text-sm">靈感與大綱</h3>
              <p className="text-xs text-amber-700/80 font-medium mt-0.25">點此展開全域故事架構，寫作不迷路</p>
            </div>
          </div>
          <div className="text-amber-500 font-black text-xl group-hover:translate-x-2 transition-transform pr-2">
            ➔
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {chapters.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-slate-400">
              <p className="mb-4">這本小說還沒有任何章節</p>
              <button 
                onClick={handleCreateChapter}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors font-medium text-sm"
              >
                立即建立第一章
              </button>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="chapters-list">
                {(provided) => (
                  <div 
                    {...provided.droppableProps} 
                    ref={provided.innerRef}
                    className="divide-y divide-slate-100"
                  >
                    {chapters.map((chapter, index) => (
                      <Draggable key={chapter.id} draggableId={chapter.id} index={index}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            style={provided.draggableProps.style as React.CSSProperties}
                            className={`p-3 transition-colors flex justify-between items-center group ${
                              snapshot.isDragging ? 'bg-blue-50 shadow-lg ring-1 ring-blue-200' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div 
                                {...provided.dragHandleProps}
                                className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing p-2"
                              >
                                <GripVertical size={18} />
                              </div>
                              
                              {/* 點擊標題進入編輯器 */}
                              <span 
                                onClick={() => router.push(`/novel_list/${novelId}/editor/${chapter.id}`)}
                                className="font-medium text-slate-700 group-hover:text-blue-600 transition-colors cursor-pointer flex-1 py-2"
                              >
                                {chapter.title}
                              </span>
                            </div>
                            
                            <div className="pl-4">
                              {renderStatusBadge(chapter.status)}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </div>
    </div>
  )
}