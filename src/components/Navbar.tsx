"use client"

import * as React from "react"
import { ChevronDown, Sparkles } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { useOverlay } from "@/contexts/OverlayContext"

type NavbarProps = {
  onLogin?: () => void
  onLogout?: () => void
}

export default function Navbar({
  onLogin,
  onLogout,
}: NavbarProps) {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement | null>(null)

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

  const handleLogin = () => {
    setIsLoggedIn(true)
    setMenuOpen(false)
    onLogin?.()
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setMenuOpen(false)
    onLogout?.()
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/70 bg-white/95 shadow-sm shadow-slate-200/40 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-slate-50 text-slate-900 shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-950">Writer's Haven</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isLoggedIn ? (
            <Button onClick={handleLogin} variant="default" size="default">
              登入
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <button 
                onClick={handleDiscussionClick} 
                className={cn(
                  "px-3 py-1 rounded transition-colors duration-200",
                  isDiscussionOpen 
                    ? "bg-slate-700 hover:bg-slate-800 text-white" // 打開時變深色
                    : "bg-blue-100 hover:bg-blue-200 text-blue-700" // 關閉時是亮色
                )}
              >
                {isDiscussionOpen ? "👁️‍🗨️" : "🗨️"}
              </button>

              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-2 text-sm font-medium text-slate-950 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <Avatar size="sm">
                    <AvatarFallback>你</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">使用者</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-slate-600 transition-transform",
                      menuOpen ? "rotate-180" : "rotate-0"
                    )}
                  />
                </button>

                {menuOpen ? (
                  <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-2xl border border-border/80 bg-white shadow-lg shadow-slate-200/50">
                    <div className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-950">
                        使用者姓名
                      </p>
                      <p className="text-xs text-slate-500">user@example.com</p>
                    </div>
                    <div className="border-t border-border/70" />
                    <button
                      type="button"
                      onClick={handleLogout}
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

