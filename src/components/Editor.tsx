'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { useState, useCallback, useEffect } from 'react'
import { useEditorUI } from '@/contexts/EditorUIContext'

interface EditorProps {
  novelId: string;
  chapterId: string;
  initialTitle: string;
  initialContent: any;
}

export default function Editor({ novelId, chapterId, initialTitle, initialContent }: EditorProps) {
  // 核心修正：儲存按鈕狀態管理
  const [isSaving, setIsSaving] = useState(false)
  const [, setTick] = useState(0)
  const forceUpdate = useCallback(() => setTick(tick => tick + 1), [])
  
  // 存檔狀態顯示
  const [saveStatus, setSaveStatus] = useState('已儲存')

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    immediatelyRender: false,
    content: initialContent || '<p>開始撰寫你的偉大故事...</p>',
    editorProps: {
      attributes: {
        // 🌟 優化：寬度撐滿，聚焦時不產生原生框線
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

  // 監聽時光機還原訊號
  useEffect(() => {
    if (editor && latestRestoredContent) {
      editor.commands.setContent(latestRestoredContent)
      setLatestRestoredContent(null)
      setSaveStatus('● 已儲存') // 還原成功後自動歸位
    }
  }, [latestRestoredContent, editor, setLatestRestoredContent])

  // 🌟 核心修正：完整接通 isSaving 狀態鏈，並對齊變淡特效
  const handleSave = async () => {
    if (!editor || isSaving) return
    
    setIsSaving(true) // 🎬 進入處理中
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
      await fetchVersions(novelId, chapterId)

    } catch (error) {
      console.error(error)
      setSaveStatus('❌ 儲存失敗')
    } finally {
      setIsSaving(false) // 🎬 解除鎖定
    }
  };

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

          <div className="flex items-center gap-5">
            <button 
              onClick={handleSave}
              disabled={editor.isEmpty || isSaving}
              className="px-5 py-2 rounded-lg font-semibold transition-all shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700"
            >
              {isSaving ? '處理中...' : '儲存章節'}
            </button>
            <div className="w-9 h-9 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold cursor-pointer border-2 border-white shadow-sm text-sm select-none">
              U
            </div>
          </div>
        </div>

        {/* B / I / U 快捷列 */}
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

      {/* 🌟 修正點一：承載白紙卡片的局部滾動層 */}
      {/* 移除原本的 py-10，改由內部卡片的上下邊距 padding 來推開，這樣滾到最底部時才不會被硬生生截斷！ */}
      <div className="flex-1 w-full overflow-y-auto bg-[#f8f9fa] flex flex-col items-center px-4 custom-scrollbar">
        
        {/* 🌟 修正點二：白紙卡片本體 */}
        {/* 加上 my-10 確保卡片上下與視窗邊緣有完美留白 */}
        {/* 核心巨變：加入 h-auto 與 shrink-0，強制瀏覽器不准壓縮白紙，讓它隨小說字數動態長高！ */}
        <div className="w-full max-w-[816px] h-auto shrink-0 bg-white border border-gray-200 shadow-[0_4px_25px_rgba(0,0,0,0.04)] p-[60px] min-h-[1100px] rounded-2xl my-10 transition-all">
          
          {/* Tiptap 核心本文 */}
          <EditorContent editor={editor} />
          
        </div>
      </div>

    </div>
  )
}