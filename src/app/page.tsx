// src/app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 font-sans">
      <main className="flex w-full max-w-4xl flex-col items-center justify-center px-6 py-12">
        
        {/* 標題區塊 */}
        <div className="mb-12 flex flex-col items-center gap-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            整合式小說創作平台
          </h1>
          <p className="max-w-lg text-lg text-slate-500">
            請選擇您要進入的系統模組，開始您的創作旅程。
          </p>
        </div>

        {/* 導覽按鈕區塊 */}
        <div className="flex flex-col gap-6 w-full max-w-3xl sm:flex-row sm:justify-center">
          
          {/* 1. 文字編輯器 */}
          <Link
            href="/editor"
            className="group flex h-20 w-full flex-col items-center justify-center gap-1 rounded-2xl bg-blue-600 px-6 text-white shadow-lg transition-all hover:scale-105 hover:bg-blue-700 hover:shadow-xl sm:w-1/3"
          >
            <span className="text-2xl mb-1 group-hover:-translate-y-1 transition-transform">✍️</span>
            <span className="font-bold text-lg">文字編輯器</span>
          </Link>

          {/* 2. 設定集 (我們剛才做好的系統) */}
          <Link
            href="/settings"
            className="group flex h-20 w-full flex-col items-center justify-center gap-1 rounded-2xl bg-emerald-600 px-6 text-white shadow-lg transition-all hover:scale-105 hover:bg-emerald-700 hover:shadow-xl sm:w-1/3"
          >
            <span className="text-2xl mb-1 group-hover:-translate-y-1 transition-transform">📚</span>
            <span className="font-bold text-lg">設定集</span>
          </Link>

          {/* 3. 討論區 */}
          <Link
            href="/discussions"
            className="group flex h-20 w-full flex-col items-center justify-center gap-1 rounded-2xl bg-purple-600 px-6 text-white shadow-lg transition-all hover:scale-105 hover:bg-purple-700 hover:shadow-xl sm:w-1/3"
          >
            <span className="text-2xl mb-1 group-hover:-translate-y-1 transition-transform">💬</span>
            <span className="font-bold text-lg">討論區</span>
          </Link>

        </div>
      </main>
    </div>
  );
}