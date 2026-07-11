// src/app/page.tsx
//主頁面
import Link from "next/link";
import { redirect } from 'next/navigation';

export default function HomePage() {
  // 將所有來到根目錄 (/) 的使用者，瞬間無縫導向大廳
  redirect('/explore');
}