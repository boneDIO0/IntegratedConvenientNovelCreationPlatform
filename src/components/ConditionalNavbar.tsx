'use client'

import { usePathname } from 'next/navigation'
import Navbar from '@/components/Navbar'

export default function ConditionalNavbar() {
  const pathname = usePathname()

  // 📍 核心邏輯：判斷目前是不是「沉浸式閱讀頁面」
  // 檢查網址格式是否為 /explore/某個ID/某個章節ID
  const isReaderPage = /^\/explore\/[^\/]+\/[^\/]+$/.test(pathname || '')

  // 如果是閱讀頁面，就回傳 null (什麼都不畫，徹底隱藏)
  if (isReaderPage) {
    return null
  }

  // 其他所有頁面 (大廳、後台等)，正常顯示原本的 Navbar
  return <Navbar />
}