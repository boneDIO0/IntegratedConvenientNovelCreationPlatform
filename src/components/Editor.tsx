'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline' // 1. 引入剛剛安裝的底線套件

export default function Editor() {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline, // 2. 把底線套件放進裝備庫
    ],
    immediatelyRender: false,
    content: '<p>開始撰寫你的偉大故事...</p>',
    editorProps: {
      attributes: {
        // 這裡是你原本的編輯器樣式，保持不變
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] border border-gray-700 p-6 rounded-lg bg-gray-900 text-gray-100',
      },
    },
  })

  if (!editor) {
    return null
  }

  // 3. 這是一個幫我們統一樣式的小工具，讓按鈕變成正方形、有質感的 B I U 風格
  const getButtonClass = (isActive: boolean) => {
    return `w-10 h-10 flex items-center justify-center rounded font-serif text-xl border transition-all ${
      isActive 
        ? 'bg-blue-600 border-blue-500 text-white' // 按下時變成亮藍色
        : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white' // 沒按下時的深色質感
    }`
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      {/* 編輯器工具列 */}
      <div className="mb-4 flex gap-2 border-b border-gray-300 pb-4">
        
        {/* B 粗體按鈕 */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`${getButtonClass(editor.isActive('bold'))} font-bold`}
          title="粗體 (Ctrl+B)"
        >
          B
        </button>

        {/* I 斜體按鈕 */}
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`${getButtonClass(editor.isActive('italic'))} italic`}
          title="斜體 (Ctrl+I)"
        >
          I
        </button>

        {/* U 底線按鈕 */}
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`${getButtonClass(editor.isActive('underline'))} underline underline-offset-4`}
          title="底線 (Ctrl+U)"
        >
          U
        </button>

      </div>

      {/* 編輯器本體 */}
      <EditorContent editor={editor} />
    </div>
  )
}