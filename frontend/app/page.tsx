import Editor from '@/components/Editor'

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-black p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-2 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          DEMO
        </h1>
        <p className="text-center text-gray-400 mb-8">整合式便捷小說創作平台</p>
        
        {/* 這裡就是召喚我們剛剛寫好的編輯器 */}
        <Editor />
      </div>
    </main>
  )
}