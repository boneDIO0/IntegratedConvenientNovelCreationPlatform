'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { MathExtension } from '@aarkue/tiptap-math-extension'
import 'katex/dist/katex.min.css'
import { DiscussionBoard } from '@/components/DiscussionBoard'
import { MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface PublicChapterData {
  title: string;
  content: any;
  publishedAt: string;
  project: {
    title: string;
  };
}

export default function PublicReaderPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const chapterId = params.chapterId as string

  const [chapter, setChapter] = useState<PublicChapterData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [isDiscussionOpen, setIsDiscussionOpen] = useState(false)
  const [userRole, setUserRole] = useState<string>('VIEWER')

  useEffect(() => {
    const fetchChapter = async () => {
      try {
        const res = await fetch(`/api/public/projects/${id}/chapters/${chapterId}`)
        if (!res.ok) {
          if (res.status === 404) throw new Error('這個章節不存在，或作者已將其隱藏。')
          throw new Error('讀取章節失敗')
        }
        const data = await res.json()
        setChapter(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    if (id && chapterId) fetchChapter()
  }, [id, chapterId])

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7]">載入中...</div>
  if (error) return <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7] text-red-500 font-bold">{error}</div>
  if (!chapter) return null

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex flex-col font-sans">
      {/* 頂部極簡導覽列 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[800px] mx-auto px-6 py-4 flex items-center justify-between">
          <button 
            onClick={() => router.push(`/explore/${id}`)}
            className="text-gray-500 hover:text-blue-600 font-medium transition-colors flex items-center gap-2"
          >
            ← 返回目錄
          </button>
          <span className="text-gray-400 text-sm font-medium truncate max-w-[200px] md:max-w-[400px]">
            {chapter.project.title}
          </span>
          <div className="w-16"></div> {/* 佔位符，讓標題置中 */}
        </div>
      </div>

      {/* 閱讀區塊 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center py-10 px-4">
        <div className="w-full max-w-[800px] bg-white border border-gray-200 shadow-sm p-10 md:p-16 rounded-2xl min-h-[800px]">
          
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
            {chapter.title}
          </h1>
          
          <div className="text-gray-400 text-sm font-medium border-b border-gray-100 pb-8 mb-8">
            發布時間：{new Date(chapter.publishedAt).toLocaleString()}
          </div>

          {/* 呼叫唯讀編輯器 */}
          <ReadOnlyContent content={chapter.content} />

        </div>
      </div>

      {/* 留言板 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300">
        {/* 摺疊按鈕標題列 */}
        <button 
          onClick={() => setIsDiscussionOpen(!isDiscussionOpen)}
          className="w-full px-8 py-5 bg-gray-50 hover:bg-blue-50/50 flex items-center justify-between transition-colors focus:outline-none"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg transition-colors ${isDiscussionOpen ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
              <MessageCircle size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">讀者討論區</h2>
          </div>
          <div className="text-gray-400">
            {isDiscussionOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </div>
        </button>
          
        {/* 展開後的內容區 */}
        {isDiscussionOpen && (
          <div className="p-2 border-t border-gray-100 bg-gray-50/30 animate-in fade-in slide-in-from-top-2 duration-300">
            <DiscussionBoard 
              projectId={id} 
              channelId={`explore_${chapterId}`}
              mode="public"
              currentUserRole={userRole} 
            />
          </div>
        )}
      </div>
    </div>
  )
}

// 📍 將唯讀編輯器抽成一個小元件，確保 content 載入後才初始化
function ReadOnlyContent({ content }: { content: any }) {
  const editor = useEditor({
    extensions: [
      StarterKit, 
      Underline,
      MathExtension.configure({ evaluation: false })
    ],
    content: content,
    editable: false, // 📍 核心魔法：關閉編輯功能，變成純閱讀器
    immediatelyRender: false,
    editorProps: {
      attributes: {
        // 套用與編輯器一模一樣的排版樣式
        class: 'prose max-w-none focus:outline-none text-[20px] leading-relaxed text-gray-800',
      },
    },
  })

  if (!editor) return null

  return <EditorContent editor={editor} />
}