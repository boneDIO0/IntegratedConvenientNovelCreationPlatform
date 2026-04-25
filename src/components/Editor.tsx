'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { useState, useCallback } from 'react'

export default function Editor() {
  // 建立一個 dummy state 用來強制 React 重新渲染工具列
  const [, setTick] = useState(0)
  const forceUpdate = useCallback(() => setTick(tick => tick + 1), [])

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    immediatelyRender: false,
    content: '<p>開始撰寫你的偉大故事...</p>',
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[800px]',
      },
    },
    // 🌟 關鍵：當編輯器有任何變動（打字、移動游標、格式切換）時，強制重繪 UI
    onTransaction: () => {
      forceUpdate()
    },
  })

  if (!editor) {
    return null
  }

  // 🌟 修改點：手動判定開關狀態的處理函式
  const handleToggle = (type: string) => {
    const isActive = editor.isActive(type)
    
    // 這裡可以根據「即將發生」的狀態做判斷
    if (isActive) {
      // 目前是開啟的 -> 準備關閉
      console.log(`${type} 功能即將：關閉`)
    } else {
      // 目前是關閉的 -> 準備開啟
      console.log(`${type} 功能即將：開啟`)
    }

    // 執行 Tiptap 指令
    if (type === 'bold') editor.chain().focus().toggleBold().run()
    if (type === 'italic') editor.chain().focus().toggleItalic().run()
    if (type === 'underline') editor.chain().focus().toggleUnderline().run()
  }

  // 按鈕樣式邏輯
  const getButtonClass = (type: string) => {
    const isActive = editor.isActive(type)
    return `w-8 h-8 flex items-center justify-center rounded text-lg transition-all active:scale-90 ${
      isActive 
        ? 'bg-gray-300 text-blue-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)] ring-1 ring-gray-400/30' // 開啟狀態：深色陷入感
        : 'bg-transparent text-gray-500 hover:bg-gray-100' // 關閉狀態：平滑無陰影
    }`
  }

  return (
    <div className="flex flex-col w-full h-screen overflow-y-auto bg-[#f8f9fa]">
      
      {/* 頂部固定區域 */}
      <div className="sticky top-0 z-50 flex flex-col bg-[#f8f9fa]/95 backdrop-blur-sm border-b border-gray-300 shadow-sm">
        
        {/* 上層佈局 */}
        <div className="flex justify-between items-center px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="w-16 h-8 bg-blue-600 rounded text-white flex items-center justify-center font-bold text-sm shadow-sm">
              DEMO
            </div>
            <div className="flex flex-col items-start">
              <input 
                type="text" 
                defaultValue="未命名的作品" 
                className="text-left text-lg font-semibold text-gray-800 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none bg-transparent px-2 py-0.5 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-5">
            <button type="button" className="bg-blue-600 text-white px-5 py-1.5 rounded-full font-bold hover:bg-blue-700 transition-colors shadow-md text-sm">
              發布作品
            </button>
            <div className="w-9 h-9 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold cursor-pointer border-2 border-white shadow-sm text-sm">
              U
            </div>
          </div>
        </div>

        {/* 下層：工具列 */}
        <div className="flex gap-1.5 px-3 py-1.5 bg-[#edf2fa] rounded-lg mx-6 mb-3 w-max border border-blue-100/50 shadow-sm">
          <button
            type="button"
            onClick={() => handleToggle('bold')}
            className={getButtonClass('bold')}
            title="粗體 (Ctrl+B)"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => handleToggle('italic')}
            className={getButtonClass('italic')}
            title="斜體 (Ctrl+I)"
          >
            <span className="italic font-serif text-xl">I</span>
          </button>
          <button
            type="button"
            onClick={() => handleToggle('underline')}
            className={getButtonClass('underline')}
            title="底線 (Ctrl+U)"
          >
            <span className="underline underline-offset-4">U</span>
          </button>
        </div>
      </div>

      {/* 編輯紙張區 */}
      <div className="flex-1 flex justify-center py-10">
        <div className="w-full max-w-[816px] bg-white border border-gray-300 shadow-[0_0_15px_rgba(0,0,0,0.05)] p-[60px] min-h-[1056px] mb-20">
          <EditorContent editor={editor} />
        </div>
      </div>

    </div>
  )
}