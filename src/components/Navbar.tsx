"use client"

import { useParams } from "next/navigation"
import { History } from "lucide-react" // 引入漂亮的圖示

import * as React from "react"
import { ChevronDown, BookOpenCheck } from "lucide-react"
import { signIn, signOut, useSession } from "next-auth/react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { useOverlay } from "@/contexts/OverlayContext"
import { useRouter, usePathname } from "next/navigation"
import { useEditorUI } from "@/contexts/EditorUIContext"

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()

  const projectId = (params?.projectId) as string
  const chapterId = (params?.chapterId) as string

  const { isSettingsOpen, toggleSettings, activeOverlay, setActiveOverlay, fetchVersions } = useEditorUI()

  // 🌟 1. 偵測目前在哪個頁面
  const isEditorPage = pathname?.includes('/editor');
  // 如果網址包含 /novel_list/ 且不是編輯器，且不是首頁(/novel_list)，那就是章節列表頁
  const isChapterListPage = pathname?.startsWith('/novel_list/') && !isEditorPage && pathname !== '/novel_list';
  
  const currentNovelId = (isEditorPage || isChapterListPage) ? pathname.split('/')[2] : null;

  const [menuOpen, setMenuOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement | null>(null)
  const { data: session, status } = useSession()

  const { isDiscussionOpen, toggleDiscussion } = useOverlay()

  const handleDiscussionClick = () => {
    toggleDiscussion() // 切換全螢幕討論區按鈕
    setMenuOpen(false)
  }

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [menuOpen])

  return (
    <nav className="sticky top-0 z-60 w-full border-b border-border/70 bg-white/95 shadow-sm shadow-slate-200/40 backdrop-blur">
      {/* 2. 移除原先的 mx-auto 和 max-w-7xl，加入 w-full 讓內容往左右兩側靠 */}
      <div className="flex w-full items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        
        {/* 左側區塊：Logo + 標題 + 返回按鈕 */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-slate-50 text-slate-900 shadow-sm">
            <BookOpenCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-950">Writer's Haven</p>
          </div>
          
          <div className="ml-6 flex items-center">
            {/* 編輯器頁面的返回按鈕 */}
            {isEditorPage && (
              <button 
                onClick={() => router.back()}
                className="text-gray-500 hover:text-blue-600 text-sm font-medium transition-colors"
              >
                ← 返回章節列表
              </button>
            )}
            {/* 章節列表頁面的返回按鈕 */}
            {isChapterListPage && (
              <button 
                onClick={() => router.back()}
                className="text-gray-500 hover:text-blue-600 text-sm font-medium transition-colors"
              >
                ← 返回作品庫
              </button>
            )}
          </div>   
        </div>

        {/* 右側區塊：使用者選單與工具列 */}
        <div className="flex items-center gap-3">
          {status !== "authenticated" ? (
            pathname !== '/login' && (
              <Button onClick={() => router.push('/login')} variant="default">
                登入
              </Button>
            )
          ) : (
            <div className="flex items-center gap-3">
              {currentNovelId && (
              <button 
                  onClick={handleDiscussionClick} 
                  className={cn(
                    "px-3 py-1 rounded transition-colors duration-200",
                    isDiscussionOpen 
                      ? "bg-slate-700 hover:bg-slate-800 text-white" 
                      : "bg-blue-100 hover:bg-blue-200 text-blue-700" 
                  )}
                >
                  {isDiscussionOpen ? "👁️‍🗨️" : "🗨️"}
                </button>
              )}
              {isEditorPage && (
                  <div className="flex items-center gap-2 mr-4 border-r pr-4">
                    {/* 修改後的歷史紀錄按鈕 */}
                    <button
                      onClick={() => {
                        if (activeOverlay === 'version') {
                          setActiveOverlay('none')
                        } else {
                          setActiveOverlay('version')
                          // 點擊打開的瞬間，立刻命令去後端 Prisma 撈取最新歷史清單
                          fetchVersions(projectId, chapterId)
                        }
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium",
                        activeOverlay === 'version'
                          ? "bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                          : "bg-purple-50 hover:bg-purple-100 text-purple-700"
                      )}
                      title="開啟版本歷史管理"
                    >
                      <History className="h-4 w-4" />
                      <span>歷史紀錄</span>
                    </button>

                    <button onClick={toggleSettings} className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors">
                      {isSettingsOpen ? '✕ 關閉設定集' : '◀ 打開設定集'}
                    </button>
                  </div>
                )}
              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-2 text-sm font-medium text-slate-950 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <Avatar size="sm">
                    <AvatarImage src={session?.user?.image || ""} />
                    <AvatarFallback>{session?.user?.name?.charAt(0) || "你"}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">{session?.user?.name || "使用者"}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-slate-600 transition-transform",
                      menuOpen ? "rotate-180" : "rotate-0"
                    )}
                  />
                </button>

                {menuOpen ? (
                  <div className="absolute right-0 z-1000 mt-2 w-44 overflow-hidden rounded-2xl border border-border/80 bg-white shadow-lg shadow-slate-200/50">
                    <div className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-950">
                        {session?.user?.name}
                      </p>
                      <p className="text-xs text-slate-500">{session?.user?.email || "無提供信箱"}</p>
                    </div>
                    <div className="border-t border-border/70" />
                    <button
                      type="button"
                      onClick={() => signOut()}
                      className="w-full px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      登出
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}