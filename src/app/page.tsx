// src/app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 font-sans">
      <main className="flex w-full max-w-5xl flex-col items-center justify-center px-6 py-12">
        
        {/* 標題區塊 */}
        <div className="mb-12 flex flex-col items-center gap-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            整合式小說創作平台
          </h1>
          <p className="max-w-lg text-lg text-slate-500">
            請選擇您要進入的系統模組，開始您的創作旅程。
          </p>
        </div>

        {/* 🌟 導覽按鈕區塊 (升級為 Grid 網格排版，完美適應 4 個按鈕) */}
        <div className="grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* 1. 文字編輯器 */}
          <Link
            href="/editor"
            className="group flex h-24 w-full flex-col items-center justify-center gap-1 rounded-2xl bg-blue-600 px-6 text-white shadow-lg transition-all hover:scale-105 hover:bg-blue-700 hover:shadow-xl"
          >
            <span className="text-3xl mb-1 transition-transform group-hover:-translate-y-1">✍️</span>
            <span className="text-lg font-bold">文字編輯器</span>
          </Link>

          {/* 2. 設定集 */}
          <Link
            href="/settings"
            className="group flex h-24 w-full flex-col items-center justify-center gap-1 rounded-2xl bg-emerald-600 px-6 text-white shadow-lg transition-all hover:scale-105 hover:bg-emerald-700 hover:shadow-xl"
          >
            <span className="text-3xl mb-1 transition-transform group-hover:-translate-y-1">📚</span>
            <span className="text-lg font-bold">設定集</span>
          </Link>

          {/* 3. 討論區 */}
          <Link
            href="/discussions"
            className="group flex h-24 w-full flex-col items-center justify-center gap-1 rounded-2xl bg-purple-600 px-6 text-white shadow-lg transition-all hover:scale-105 hover:bg-purple-700 hover:shadow-xl"
          >
            <span className="text-3xl mb-1 transition-transform group-hover:-translate-y-1">💬</span>
            <span className="text-lg font-bold">討論區</span>
          </Link>

          {/* 4. 版本管理 (🌟 新增) */}
          <Link
            href="/versions"
            className="group flex h-24 w-full flex-col items-center justify-center gap-1 rounded-2xl bg-amber-600 px-6 text-white shadow-lg transition-all hover:scale-105 hover:bg-amber-700 hover:shadow-xl"
          >
            <span className="text-3xl mb-1 transition-transform group-hover:-translate-y-1">🕰️</span>
            <span className="text-lg font-bold">版本管理</span>
          </Link>

        </div>
      </main>
    </div>
  );
}