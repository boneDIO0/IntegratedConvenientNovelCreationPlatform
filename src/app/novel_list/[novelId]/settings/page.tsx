'use client'

import { SettingsPanel } from "@/components/SettingsPanel";
import { useParams } from 'next/navigation';

export default function SettingsPage() {
  const params = useParams();
  // 🌟 從動態路由網址列中，精準抓取當前小說的 ID
  const novelId = params.novelId as string;

  return (
    <div className="w-full h-screen bg-white">
      {/* 🌟 核心修正：把 novelId 當作 projectId 餵給組件 */}
      <SettingsPanel projectId={novelId} />
    </div>
  );
}