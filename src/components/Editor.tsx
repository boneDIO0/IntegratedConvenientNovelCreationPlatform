'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { useState, useCallback, useEffect } from 'react'
import { useEditorUI } from '@/contexts/EditorUIContext'

// 定義這個編輯器需要接收的資料
interface EditorProps {
  novelId: string;
  chapterId: string;
  initialTitle: string;
  initialContent: any;
}

export default function Editor({ novelId, chapterId, initialTitle, initialContent }: EditorProps) {
  // 宣告狀態 (必須放在元件內部)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedContent, setLastSavedContent] = useState(initialContent)
  
  const [, setTick] = useState(0)
  const forceUpdate = useCallback(() => setTick(tick => tick + 1), [])
  
  // 存檔狀態顯示
  const [saveStatus, setSaveStatus] = useState('已儲存')

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    immediatelyRender: false,
    content: initialContent || '<p>開始撰寫你的偉大故事...</p>', // 讀取傳進來的內容
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[800px] text-[20px] leading-relaxed',
      },
    },
    onTransaction: () => {
      forceUpdate()
    },
    onUpdate: () => {
      setSaveStatus('編輯中...') // 只要打字就變成編輯中
    }
  })
  // 2. 從中拿取還原訊號
  const { latestRestoredContent, setLatestRestoredContent, fetchVersions } = useEditorUI()

  // 3. 核心：一旦發現傳來歷史版本的內文，立刻強制洗牌 Tiptap 畫布
  useEffect(() => {
      if (editor && latestRestoredContent) {
        // 將後端傳回的 Prisma Json 內文注入 Tiptap
        editor.commands.setContent(latestRestoredContent)

        // 注入成功後，將大腦的訊號重設為 null，避免重複觸發
        setLatestRestoredContent(null)
      }
    }, [latestRestoredContent, editor, setLatestRestoredContent])

  const handleSave = async () => {
      if (!editor) return
      setSaveStatus('儲存中...')

      const titleInput = document.getElementById('doc-title') as HTMLInputElement
      const currentTitle = titleInput ? titleInput.value : initialTitle
      const currentContent = editor.getJSON()

      try {
        const res = await fetch(`/api/projects/${novelId}/chapters/${chapterId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: currentTitle,
            content: currentContent,
            saveVersion: true,
            commitMsg: `${currentTitle || '未命名章節'} - 手動存檔點`
          })
        })

        if (!res.ok) throw new Error("儲存失敗")

        setSaveStatus('● 已儲存')
        fetchVersions(novelId, chapterId)

      } catch (error) {
        console.error(error)
        setSaveStatus('❌ 儲存失敗')
      }
    };

  if (!editor) {
    return null
  }

  const handleToggle = (type: string) => {
    if (type === 'bold') editor.chain().focus().toggleBold().run()
    if (type === 'italic') editor.chain().focus().toggleItalic().run()
    if (type === 'underline') editor.chain().focus().toggleUnderline().run()
  }

  const getButtonClass = (type: string) => {
    const isActive = editor.isActive(type)
    return `w-8 h-8 flex items-center justify-center rounded text-lg transition-all active:scale-90 ${
      isActive 
        ? 'bg-gray-300 text-blue-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)] ring-1 ring-gray-400/30' 
        : 'bg-transparent text-gray-500 hover:bg-gray-100' 
    }`
  }

  return (
    <div className="flex flex-col w-full h-screen overflow-y-auto bg-[#f8f9fa]">
      <div className="sticky top-0  flex flex-col bg-[#f8f9fa]/95 backdrop-blur-sm border-b border-gray-300 shadow-sm">
        <div className="flex justify-between items-center px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="w-16 h-8 bg-blue-600 rounded text-white flex items-center justify-center font-bold text-sm shadow-sm">
              DEMO
            </div>
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2">
                <input 
                  id="doc-title" // 加上 ID 讓存檔函式抓得到
                  type="text" 
                  defaultValue={initialTitle} // 預設值改成傳進來的標題
                  onChange={() => setSaveStatus('編輯中...')}
                  autoComplete="off"
                  className="text-left text-lg font-semibold text-gray-800 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none bg-transparent px-2 py-0.5 transition-all w-64"
                />
                <span className={`text-xs font-medium transition-colors ${saveStatus.includes('已儲存') ? 'text-green-600' : 'text-gray-400'}`}>
                  {saveStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <button 
              onClick={handleSave}
              disabled={editor.isEmpty || isSaving}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                (editor.isEmpty || isSaving)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isSaving ? '處理中...' : '儲存章節'}
            </button>
            <div className="w-9 h-9 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold cursor-pointer border-2 border-white shadow-sm text-sm">
              U
            </div>
          </div>
        </div>

        <div className="flex gap-1.5 px-3 py-1.5 bg-[#edf2fa] rounded-lg mx-6 mb-3 w-max border border-blue-100/50 shadow-sm">
          <button type="button" onClick={() => handleToggle('bold')} className={getButtonClass('bold')} title="粗體 (Ctrl+B)">B</button>
          <button type="button" onClick={() => handleToggle('italic')} className={getButtonClass('italic')} title="斜體 (Ctrl+I)">
            <span className="italic font-serif text-xl">I</span>
          </button>
          <button type="button" onClick={() => handleToggle('underline')} className={getButtonClass('underline')} title="底線 (Ctrl+U)">
            <span className="underline underline-offset-4">U</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex justify-center py-10">
        <div className="w-full max-w-[816px] bg-white border border-gray-300 shadow-[0_0_15px_rgba(0,0,0,0.05)] p-[60px] min-h-[1056px] mb-20">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}