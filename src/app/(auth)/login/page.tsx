"use client"; // 🌟 記得加這行，因為 signIn 是客戶端動作

import { signIn } from "next-auth/react"; // 🌟 注意：v4 Client 端是從 /react 匯入

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fdfcfb]">
      <div className="w-full max-w-md p-10 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] rounded-lg text-center border border-stone-100">
        <h1 className="text-3xl font-serif mb-2 text-stone-800">Writer's Haven</h1>
        <p className="text-stone-500 mb-10 italic font-serif">記錄每一刻的靈感流動</p>
        
        <button
          onClick={() => signIn("google", { callbackUrl: "/novel_list" })}
          className="
            w-full flex items-center justify-center gap-3 px-6 py-3 
            border border-stone-200 rounded-full 
            text-stone-700 font-medium
            transition-all duration-200
            /* 🌟 游標與 Hover 效果 */
            cursor-pointer 
            hover:bg-stone-50 
            hover:border-stone-400 
            hover:shadow-sm
            active:scale-[0.98]
          "
        >
          <img 
            src="https://authjs.dev/img/providers/google.svg" 
            width="20" 
            height="20" 
            alt="Google" 
          />
          透過 Google 帳號繼續
        </button>

        <div className="mt-8 text-xs text-stone-300 font-serif">
          登入即代表您同意我們的隱私權政策與服務條款
        </div>
      </div>
    </div>
  );
}