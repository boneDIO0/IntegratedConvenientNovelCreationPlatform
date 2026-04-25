import Editor from '@/components/Editor'

export default function EditorPage() {
  return (
    // 移除多餘的 padding 和邊界限制，背景改成淺灰色（像桌面的顏色）
    <main className="min-h-screen bg-[#f8f9fa] text-black font-sans">
      <Editor />
    </main>
  )
}