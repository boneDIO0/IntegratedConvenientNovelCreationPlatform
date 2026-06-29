'use client'

import { SettingsPanel } from "@/components/SettingsPanel";
import { useParams, useRouter } from 'next/navigation';
import { use, useEffect, useState } from "react";
import { ArrowLeft, Sliders } from "lucide-react";

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  
  // 🌟 1. 安全定錨：精準抓取當前小說 ID
  const novelId = params?.novelId as string;

  // 🌟 2. 邊界防禦機制：如果網址列解析尚未完成，噴出高質感 Skeleton 骨架屏防止畫面破防
  if (!novelId) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">正在初始化時空序列...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-slate-50/50 flex flex-col">
      {/* 🌟 3. 專題門面優化：補上具有高級 SaaS 感的麵包屑與導覽控制列 */}
      <header className="w-full bg-white border-b border-slate-200/80 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/novel_list/${novelId}`)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors border border-slate-200 bg-white shadow-sm"
            title="返回作品主頁"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="h-4 w-[1px] bg-slate-200" />
          <div>
            <div className="flex items-center gap-1.5 text-slate-900 font-bold text-lg tracking-wide">
              <Sliders size={18} className="text-blue-500" />
              <span>全域設定集工作台</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              動態調度當前作品的關係圖譜、歷史時序與雙軌制多紀元曆法規則
            </p>
          </div>
        </div>
      </header>

      {/* 主體畫布區：撐滿剩餘空間並允許內部滾動 */}
      <main className="flex-1 w-full overflow-hidden bg-white">
        {/* 🌟 穩穩餵給你的 SettingsPanel */}
        <SettingsPanel projectId={novelId} />
      </main>
    </div>
  );
}