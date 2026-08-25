"use client"

import { useParams } from "next/navigation"
import { History, ChevronDown, BookOpenCheck, Users, Bell, Check, MessageSquare, ExternalLink } from "lucide-react"

import * as React from "react"
import { signIn, signOut, useSession } from "next-auth/react"
import Link from "next/link"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { useRouter, usePathname } from "next/navigation"
import { useEditorUI } from "@/contexts/EditorUIContext"
import { DiscussionBoard } from "@/components/DiscussionBoard"
import ManageMembersModal from "@/components/ManageMembersModal"

export default function Navbar({ projectId, role }: { projectId?: string; role?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()

  const safeProjectId = projectId || (params?.novelId as string)
  const chapterId = (params?.chapterId) as string

  const { activeOverlay, setActiveOverlay, fetchVersions } = useEditorUI()

  const isEditorPage = pathname?.includes('/editor');
  const isChapterListPage = pathname?.startsWith('/novel_list/') && !isEditorPage && pathname !== '/novel_list';
  
  const currentNovelId = (isEditorPage || isChapterListPage) ? pathname.split('/')[2] : null;

  const [menuOpen, setMenuOpen] = React.useState(false)
  const [discussionOpen, setDiscussionOpen] = React.useState(false)
  const discussionRef = React.useRef<HTMLDivElement | null>(null)

  const [isMemberModalOpen, setIsMemberModalOpen] = React.useState(false)

  const [notificationsOpen, setNotificationsOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState<any[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)
  const notifRef = React.useRef<HTMLDivElement | null>(null)

  const menuRef = React.useRef<HTMLDivElement | null>(null)
  const { data: session, status } = useSession()

  const fetchNotifications = async () => {
    if (status !== 'authenticated') return;
    try {
      const res = await fetch('/api/notifications');
      const json = await res.json();
      if (json.status === 'success') {
        setNotifications(json.data);
        setUnreadCount(json.data.filter((n: any) => !n.isRead).length);
      }
    } catch (e) {
      console.error("無法取得通知", e);
    }
  }

  const handleNotificationClick = async (notif: any) => {
    if (!notif.isRead) {
      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationId: notif.id })
        });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (e) {
        console.error(e);
      }
    }
    
    if (notif.link) {
      setNotificationsOpen(false);
      router.push(notif.link);
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true })
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  }

  React.useEffect(() => {
    fetchNotifications();
  }, [status]);

  // 🌟 修正：將 discussionOpen 加入點擊外部監聽的依賴項
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false)
      }
      if (discussionOpen && discussionRef.current && !discussionRef.current.contains(event.target as Node)) {
        setDiscussionOpen(false)
      }
      if (notificationsOpen && notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [menuOpen, notificationsOpen, discussionOpen])

  return (
    <>
      <nav className="sticky top-0 z-60 w-full border-b border-border/70 bg-white/95 shadow-sm shadow-slate-200/40 backdrop-blur">
        <div className="flex w-full items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          
          {/* 左側區塊 */}
          <div className="flex items-center gap-4 md:gap-6">
            <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-slate-50 text-slate-900 shadow-sm">
                <BookOpenCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-950">Writer's Haven</p>
              </div>
            </Link>
            
            <div className="hidden md:flex items-center gap-5 border-l border-slate-200 pl-6 h-8">
              <Link 
                href="/explore" 
                className={cn(
                  "text-sm font-medium transition-colors hover:text-slate-900",
                  pathname?.startsWith("/explore") 
                    ? "text-blue-600 border-b-2 border-blue-600 pb-1" 
                    : "text-slate-500"
                )}
              >
                探索大廳
              </Link>
              <Link 
                href="/novel_list" 
                className={cn(
                  "text-sm font-medium transition-colors hover:text-slate-900",
                  pathname?.startsWith("/novel_list") 
                    ? "text-blue-600 border-b-2 border-blue-600 pb-1" 
                    : "text-slate-500"
                )}
              >
                創作後台
              </Link>
            </div>
            
            <div className="ml-2 flex items-center">
              {isEditorPage && (
                <button 
                  onClick={() => router.back()}
                  className="text-gray-500 hover:text-blue-600 text-sm font-medium transition-colors cursor-pointer"
                >
                  ← 返回章節列表
                </button>
              )}
              {isChapterListPage && (
                <button 
                  onClick={() => router.back()}
                  className="text-gray-500 hover:text-blue-600 text-sm font-medium transition-colors cursor-pointer"
                >
                  ← 返回作品庫
                </button>
              )}
            </div>   
          </div>

          {/* 右側區塊 */}
          <div className="flex items-center gap-3">
            {status !== "authenticated" ? (
              pathname !== '/login' && (
                <Button onClick={() => router.push('/login')} variant="default">
                  登入
                </Button>
              )
            ) : (
              <div className="flex items-center gap-3">
                {safeProjectId && pathname?.startsWith('/novel_list') && (
                  <>
                    <button 
                      onClick={() => setIsMemberModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      title={role?.toUpperCase() === 'OWNER' ? "管理專案成員" : "檢視成員名單"}
                    >
                      <Users className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {role?.toUpperCase() === 'OWNER' ? '管理成員' : '成員名單'}
                      </span>
                    </button>

                    {/* 協作討論區 */}
                    <div ref={discussionRef} className="relative flex items-center">
                      <button 
                        onClick={() => {
                          setDiscussionOpen(!discussionOpen);
                          setMenuOpen(false);
                          setNotificationsOpen(false);
                        }} 
                        className={cn(
                          "px-3 py-1 rounded transition-colors duration-200 text-sm flex items-center gap-1 cursor-pointer",
                          discussionOpen 
                            ? "bg-slate-700 hover:bg-slate-800 text-white" 
                            : "bg-blue-100 hover:bg-blue-200 text-blue-700" 
                        )}
                        title="開啟討論區"
                      >
                        <MessageSquare size={16} /> 
                        <span className="hidden sm:inline font-semibold">討論</span>
                      </button>

                      {discussionOpen && (
                        <div className="absolute right-0 top-full mt-2 w-80 md:w-[420px] rounded-2xl border border-border/80 bg-white shadow-xl shadow-slate-200/50 z-[100] flex flex-col overflow-hidden">
                          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <span className="font-bold text-slate-800 flex items-center gap-2">
                              <MessageSquare size={16} className="text-blue-500" />
                              {chapterId ? '本章討論' : '全域討論'}
                            </span>
                            <span className="text-xs font-medium text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {role === 'OWNER' ? '管理員' : '成員'}
                            </span>
                          </div>
                          
                          <div className="h-[450px] p-3 bg-white">
                            <DiscussionBoard 
                              projectId={safeProjectId} 
                              channelId={chapterId || 'general'} 
                              mode="private"
                              currentUserRole={role}
                              isWidget={true}
                            />
                          </div>

                          <div className="p-3 bg-slate-50 border-t border-slate-100 shrink-0">
                            <Link 
                              href={`/discussions?novelId=${safeProjectId}&channelId=${chapterId || 'general'}`}
                              target="_blank"
                              onClick={() => setDiscussionOpen(false)}
                              className="flex items-center justify-center gap-2 w-full py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm"
                            >
                              <span>在新分頁開啟完整討論區</span>
                              <ExternalLink size={16} />
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* 🌟 編輯器專屬：歷史紀錄與設定集 Popover */}
                {isEditorPage && (
                  <div className="flex items-center gap-2 mr-4 border-r pr-4">
                    <button
                      onClick={() => {
                        if (activeOverlay === 'version') {
                          setActiveOverlay('none')
                        } else {
                          setActiveOverlay('version')
                          fetchVersions(safeProjectId, chapterId)
                        }
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium cursor-pointer",
                        activeOverlay === 'version'
                          ? "bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                          : "bg-purple-50 hover:bg-purple-100 text-purple-700"
                      )}
                      title="開啟版本歷史管理"
                    >
                      <History className="h-4 w-4" />
                      <span>歷史紀錄</span>
                    </button>

                  </div>
                )}

                {/* 通知小鈴鐺 */}
                <div ref={notifRef} className="relative flex items-center mr-1">
                  <button
                    type="button"
                    onClick={() => {
                      setNotificationsOpen(!notificationsOpen);
                      if (!notificationsOpen) fetchNotifications();
                      setMenuOpen(false);
                    }}
                    className="relative p-2 text-slate-500 hover:text-slate-900 transition-colors rounded-full hover:bg-slate-100 cursor-pointer"
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {notificationsOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 md:w-96 overflow-hidden rounded-2xl border border-border/80 bg-white shadow-xl shadow-slate-200/50 z-50">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                        <span className="font-bold text-slate-800">通知</span>
                        {unreadCount > 0 && (
                          <button 
                            onClick={handleMarkAllAsRead}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Check size={14} /> 全部標記已讀
                          </button>
                        )}
                      </div>
                      
                      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                          <div className="py-10 text-center flex flex-col items-center">
                            <Bell className="h-8 w-8 text-slate-200 mb-2" />
                            <p className="text-sm text-slate-500 font-medium">目前沒有任何通知</p>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            {notifications.map((notif) => (
                              <div 
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className={cn(
                                  "flex gap-3 px-4 py-3 border-b border-slate-50 transition-colors cursor-pointer hover:bg-slate-50",
                                  !notif.isRead ? "bg-blue-50/30" : "bg-white"
                                )}
                              >
                                {notif.actor?.image ? (
                                  <img src={notif.actor.image} alt="User" className="w-8 h-8 rounded-full border border-slate-200 mt-0.5 object-cover shrink-0" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs mt-0.5 shrink-0 border border-slate-200">
                                    {notif.actor?.name?.charAt(0) || '系統'}
                                  </div>
                                )}
                                
                                <div className="flex-1 min-w-0">
                                  <p className={cn(
                                    "text-sm leading-snug",
                                    !notif.isRead ? "text-slate-900 font-medium" : "text-slate-600"
                                  )}>
                                    {notif.message}
                                  </p>
                                  <p className="text-xs text-slate-400 mt-1">
                                    {new Date(notif.createdAt).toLocaleString(undefined, {
                                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                    })}
                                  </p>
                                </div>

                                {!notif.isRead && (
                                  <div className="shrink-0 mt-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                  
                {/* 使用者個人選單 */}
                <div ref={menuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(!menuOpen);
                      setNotificationsOpen(false);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-2 text-sm font-medium text-slate-950 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
                  >
                    <Avatar className="h-6 w-6">
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
                        className="w-full px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50 cursor-pointer"
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

      {safeProjectId && (
        <ManageMembersModal 
          projectId={safeProjectId} 
          isOpen={isMemberModalOpen} 
          onClose={() => setIsMemberModalOpen(false)}
          currentUserRole={role || 'viewer'}
          currentUserId={session?.user?.id || ''} 
        />
      )}
    </>
  )
}