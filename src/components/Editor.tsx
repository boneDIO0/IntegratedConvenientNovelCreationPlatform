'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { useState, useCallback, useEffect } from 'react'
import { useEditorUI } from '@/contexts/EditorUIContext'
import 'katex/dist/katex.min.css'
import { MathExtension } from '@aarkue/tiptap-math-extension'

// 📍 更新：新增 initialStatus
interface EditorProps {
  novelId: string;
  chapterId: string;
  initialTitle: string;
  initialContent: any;
  initialStatus: string; 
}

export default function Editor({ novelId, chapterId, initialTitle, initialContent, initialStatus }: EditorProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [, setTick] = useState(0)
  const forceUpdate = useCallback(() => setTick(tick => tick + 1), [])
  const [saveStatus, setSaveStatus] = useState('已儲存')
  const [chapterStatus, setChapterStatus] = useState(initialStatus) // 📍 管理當前的發布狀態

  const editor = useEditor({
    extensions: [StarterKit, Underline, MathExtension.configure({ evaluation: false })],
    immediatelyRender: false,
    content: initialContent || '<p>開始撰寫你的偉大故事...</p>',
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[800px] text-[20px] leading-relaxed',
      },
    },
    onTransaction: () => {
      forceUpdate()
    },
    onUpdate: () => {
      setSaveStatus('編輯中...') 
    }
  })

  const { latestRestoredContent, setLatestRestoredContent, fetchVersions } = useEditorUI()

  useEffect(() => {
    if (editor && latestRestoredContent) {
      editor.commands.setContent(latestRestoredContent)
      setLatestRestoredContent(null)
      setSaveStatus('● 已儲存') 
    }
  }, [latestRestoredContent, editor, setLatestRestoredContent])

  // 📍 更新：接收 newStatus 並傳給後端
  const handleSave = useCallback(async (newStatus?: string) => {
    if (!editor || isSaving) return
    
    setIsSaving(true) 
    setSaveStatus('儲存中...')

    const titleInput = document.getElementById('doc-title') as HTMLInputElement
    const currentTitle = titleInput ? titleInput.value : initialTitle
    const currentContent = editor.getJSON()
    
    // 如果沒有傳入新狀態，就維持原本的狀態
    const targetStatus = typeof newStatus === 'string' ? newStatus : chapterStatus

    try {
      const res = await fetch(`/api/projects/${novelId}/chapters/${chapterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: currentTitle,
          content: currentContent,
          saveVersion: true,
          commitMsg: `${currentTitle || '未命名章節'} - 手動存檔點`,
          status: targetStatus // 📍 把狀態一併送給後端
        })
      })

      if (!res.ok) throw new Error("儲存失敗")

      setSaveStatus('● 已儲存')
      setChapterStatus(targetStatus) // 儲存成功後，更新本地的按鈕狀態
      await fetchVersions(novelId, chapterId)

    } catch (error) {
      console.error(error)
      setSaveStatus('❌ 儲存失敗')
    } finally {
      setIsSaving(false) 
    }
  }, [editor, isSaving, novelId, chapterId, initialTitle, fetchVersions, chapterStatus])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault(); 
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  if (!editor) return null

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
    <div className="flex flex-col w-full h-full bg-[#f8f9fa] overflow-hidden relative">
      <div className="w-full flex flex-col bg-white border-b border-gray-200 shadow-sm z-30 shrink-0">
        <div className="flex justify-between items-center px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="w-16 h-8 bg-blue-600 rounded text-white flex items-center justify-center font-bold text-sm shadow-sm select-none">
              DEMO
            </div>
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2">
                <input 
                  id="doc-title" 
                  type="text" 
                  defaultValue={initialTitle} 
                  onChange={() => setSaveStatus('編輯中...')}
                  autoComplete="off"
                  className="text-left text-lg font-semibold text-gray-800 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none bg-transparent px-2 py-0.5 transition-all w-64"
                />
                <span className={`text-xs font-semibold transition-colors ${saveStatus.includes('已儲存') ? 'text-emerald-600' : 'text-amber-500'}`}>
                  {saveStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 📍 新增：發布 / 隱藏按鈕 */}
            <button 
              onClick={() => handleSave(chapterStatus === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED')}
              disabled={editor.isEmpty || isSaving}
              className={`px-4 py-2 rounded-lg font-semibold transition-all shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed border ${
                chapterStatus === 'PUBLISHED' 
                  ? 'bg-white text-red-500 border-red-200 hover:bg-red-50' 
                  : 'bg-emerald-500 text-white border-transparent hover:bg-emerald-600'
              }`}
            >
              {isSaving ? '處理中...' : (chapterStatus === 'PUBLISHED' ? '隱藏此章節' : '公開發布')}
            </button>

            <button 
              onClick={() => handleSave()}
              disabled={editor.isEmpty || isSaving}
              className="px-5 py-2 rounded-lg font-semibold transition-all shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700"
            >
              {isSaving ? '處理中...' : '儲存草稿'}
            </button>
            <div className="w-9 h-9 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold cursor-pointer border-2 border-white shadow-sm text-sm select-none ml-2">
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

      <div className="flex-1 w-full overflow-y-auto bg-[#f8f9fa] flex flex-col items-center px-4 custom-scrollbar">
        <div className="w-full max-w-[816px] h-auto shrink-0 bg-white border border-gray-200 shadow-[0_4px_25px_rgba(0,0,0,0.04)] p-[60px] min-h-[1100px] rounded-2xl my-10 transition-all">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}