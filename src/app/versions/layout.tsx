// src/app/versions/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "版本管理 | Writer's Haven",
  description: '小說專案的版本控制與歷史紀錄',
};

// 🌟 名稱改為 VersionsLayout，並拔除 html 與 body 標籤
export default function VersionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full w-full flex flex-col">
      {children}
    </div>
  );
}