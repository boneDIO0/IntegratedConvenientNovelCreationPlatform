'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import CharacterCount from '@tiptap/extension-character-count'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useEditorUI } from '@/contexts/EditorUIContext'
import AssistantChat from './AssistantChat'
import { NotesPanel } from '@/components/NotesPanel'
import 'katex/dist/katex.min.css'
import { MathExtension } from '@aarkue/tiptap-math-extension'
import { Eye, EyeOff, RotateCcw, BellRing, Lightbulb } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface EditorProps {
  novelId: string;
  chapterId: string;
  initialTitle: string;
  initialContent: any;
  isEditable?: boolean;
  initialStatus?: string;
}

export default function Editor({ novelId, chapterId, initialTitle, initialContent, isEditable = true, initialStatus = 'DRAFT' }: EditorProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [, setTick] = useState(0)
  const forceUpdate = useCallback(() => setTick(tick => tick + 1), [])
  const [saveStatus, setSaveStatus] = useState('已儲存')
  const [chapterStatus, setChapterStatus] = useState(initialStatus)
  const [isOnline, setIsOnline] = useState(true) // 📍 追蹤網路狀態
  const { data: session } = useSession(); // 取得當前使用者，用來判斷最新存檔是不是自己存的
  const [externalUpdate, setExternalUpdate] = useState<{ authorName: string } | null>(null); // 存放外部更新者的資訊
  const knownLatestVersionRef = useRef<string | null>(null); // 記錄目前已知的最新版本 ID
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  // 🌟 從 EditorUIContext 取出預覽與歷史版本相關 State
  const {
    versions,
    latestRestoredContent,
    setLatestRestoredContent,
    fetchVersions,
    previewVersion,
    setPreviewVersion
  } = useEditorUI()

  // 🌟 暫存進入預覽前的草稿內容與標題
  const draftBackupRef = useRef<{ title: string; content: any } | null>(null)

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const LOCAL_STORAGE_KEY = `editor_draft_${novelId}_${chapterId}`

  const editor = useEditor({
    extensions: [StarterKit, Underline, CharacterCount, MathExtension.configure({ evaluation: false })],
    immediatelyRender: false,
    editable: isEditable,
    content: initialContent || '<p>開始撰寫你的偉大故事...</p>',
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[800px] text-[20px] leading-relaxed',
      },
    },
    onTransaction: () => {
      forceUpdate()
    },
    onUpdate: ({ editor }) => {
      // 🌟 在預覽模式下不觸發打字暫存
      if (previewVersion) return;

      setSaveStatus('編輯中...')

      // 📍 機制 1：打字停頓 3 秒後，存入 LocalStorage
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

      typingTimeoutRef.current = setTimeout(() => {
        const content = editor.getJSON()
        const titleInput = document.getElementById('doc-title') as HTMLInputElement
        const currentTitle = titleInput ? titleInput.value : initialTitle

        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ title: currentTitle, content }))
        setSaveStatus(navigator.onLine ? '本機已暫存' : '⚠️ 離線中 (內容已暫存本機)')
      }, 3000)
    }
  })

  // 🌟 1. 核心邏輯：監聽 previewVersion（切換歷史版本預覽模式）
  useEffect(() => {
    if (!editor) return

    const titleInput = document.getElementById('doc-title') as HTMLInputElement

    if (previewVersion) {
      // 進入預覽：先將當前未存檔的標題與草稿內容備份起來
      if (!draftBackupRef.current) {
        draftBackupRef.current = {
          title: titleInput ? titleInput.value : initialTitle,
          content: editor.getJSON()
        }
      }

      // 切換編輯器內容為預覽版本的 JSON 內容，並鎖定為唯讀
      editor.commands.setContent(previewVersion.content || {})
      editor.setEditable(false)

    } else {
      // 退出預覽：還原備份的草稿內容與標題，並解鎖編輯權限
      if (draftBackupRef.current) {
        editor.commands.setContent(draftBackupRef.current.content)
        if (titleInput) {
          titleInput.value = draftBackupRef.current.title
        }
        draftBackupRef.current = null // 清空備份
      }

      // 恢復為原先傳入的權限 (isEditable)
      editor.setEditable(isEditable)
    }
  }, [previewVersion, editor, isEditable, initialTitle])

  // 📍 機制 2：每 3 分鐘自動從 LocalStorage 撈取最新資料，靜默存入 DB
  useEffect(() => {
    if (!isEditable || previewVersion) return; // 🌟 預覽模式下跳過自動存檔

    const autoSaveInterval = setInterval(async () => {
      if (!navigator.onLine || isSaving || !editor) return;

      const draftData = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (!draftData) return;

      try {
        const { title, content } = JSON.parse(draftData)
        setSaveStatus('自動儲存中...')

        const res = await fetch(`/api/projects/${novelId}/chapters/${chapterId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title,
            content: content,
            saveVersion: false,
            status: chapterStatus
          })
        })

        if (res.ok) {
          setSaveStatus('● 已儲存')
          localStorage.removeItem(LOCAL_STORAGE_KEY)
        }
      } catch (error) {
        console.error('自動存檔失敗', error)
        setSaveStatus('⚠️ 自動存檔失敗')
      }
    }, 3 * 60 * 1000)

    return () => clearInterval(autoSaveInterval)
  }, [editor, isSaving, novelId, chapterId, chapterStatus, isEditable, LOCAL_STORAGE_KEY, previewVersion])

  // 📍 機制 3：監聽使用者「切換分頁」或「關閉網頁」的瞬間
  useEffect(() => {
    if (!isEditable || previewVersion) return; // 🌟 預覽模式下不執行離線 keepalive

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && navigator.onLine) {
        const draftData = localStorage.getItem(LOCAL_STORAGE_KEY)

        if (draftData) {
          const { title, content } = JSON.parse(draftData)

          fetch(`/api/projects/${novelId}/chapters/${chapterId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: title,
              content: content,
              saveVersion: true,
              commitMsg: "系統自動存檔 (離開網頁)",
              status: chapterStatus,
              isAutoSave: true
            }),
            keepalive: true
          })
        }
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleVisibilityChange);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleVisibilityChange);
    };
  }, [novelId, chapterId, chapterStatus, isEditable, LOCAL_STORAGE_KEY, previewVersion]);

  // 📍 機制 4：監聽網路斷線與重連狀態
  useEffect(() => {
    if (typeof window === 'undefined' || !isEditable) return;

    setIsOnline(navigator.onLine);

    const handleOffline = () => {
      setIsOnline(false);
      setSaveStatus('⚠️ 網路已斷線 (內容已安全暫存本機)');
    };

    const handleOnline = async () => {
      setIsOnline(true);

      const draftData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (draftData) {
        setSaveStatus('🔄 恢復連線，同步進度中...');
        try {
          const { title, content } = JSON.parse(draftData);
          const res = await fetch(`/api/projects/${novelId}/chapters/${chapterId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: title,
              content: content,
              saveVersion: false,
              status: chapterStatus
            })
          });

          if (res.ok) {
            setSaveStatus('✅ 已恢復連線並同步完成');
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            setTimeout(() => setSaveStatus('● 已儲存'), 3000);
          }
        } catch (error) {
          setSaveStatus('⚠️ 同步失敗，請重試');
        }
      } else {
        setSaveStatus('● 已儲存');
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [novelId, chapterId, chapterStatus, isEditable, LOCAL_STORAGE_KEY]);

  // 📍 機制 5：輕量級 Polling (每 20 秒拉取一次最新歷史版本)
  useEffect(() => {
    if (!isEditable || previewVersion) return; // 預覽或唯讀時不需 polling

    const pollingInterval = setInterval(() => {
      if (navigator.onLine) {
        fetchVersions(novelId, chapterId); // 背景默默更新側邊欄的版本清單
      }
    }, 20 * 1000); // 20秒檢查一次

    return () => clearInterval(pollingInterval);
  }, [isEditable, previewVersion, novelId, chapterId, fetchVersions]);


  // 📍 機制 6：比對最新版本，偵測是否被其他人更新
  useEffect(() => {
    if (versions.length > 0) {
      const latest = versions[0];

      // 第一次載入時，純粹記錄基準點，不觸發通知
      if (!knownLatestVersionRef.current) {
        knownLatestVersionRef.current = latest.id;
        return;
      }

      // 發現新版本！
      if (latest.id !== knownLatestVersionRef.current) {
        // 如果這個新版本「不是」當前使用者存的
        if (session?.user?.id && latest.authorId !== session.user.id) {
          setExternalUpdate({
            authorName: latest.author?.name || '其他協作者'
          });
        }
        // 更新基準點，避免重複觸發
        knownLatestVersionRef.current = latest.id;
      }
    }
  }, [versions, session?.user?.id]);


  // 🌟 處理：當使用者點擊「載入最新版本」
  const handleLoadExternalUpdate = async () => {
    if (!editor) return;
    if (!confirm("載入最新版本將會覆蓋您畫面上尚未存檔的內容，確定要載入嗎？")) return;

    try {
      const res = await fetch(`/api/projects/${novelId}/chapters/${chapterId}`);
      if (res.ok) {
        const data = await res.json();
        
        // 替換畫面內容與標題
        editor.commands.setContent(data.content || {});
        const titleInput = document.getElementById('doc-title') as HTMLInputElement;
        if (titleInput && data.title) titleInput.value = data.title;
        
        // 清除提示並重置本地暫存
        setExternalUpdate(null);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        setSaveStatus('● 已載入最新進度');
      }
    } catch (error) {
      console.error("載入最新進度失敗", error);
      alert("載入失敗，請檢查網路狀態");
    }
  };

  // 🌟 2. 監聽還原特定版本成功
  useEffect(() => {
    if (editor && latestRestoredContent) {
      editor.commands.setContent(latestRestoredContent)
      draftBackupRef.current = null // 清除預覽前的備份
      setPreviewVersion(null)        // 自動關閉預覽模式
      editor.setEditable(isEditable) // 恢復編輯狀態
      setLatestRestoredContent(null)
      setSaveStatus('● 已還原版本並儲存')
    }
  }, [latestRestoredContent, editor, setLatestRestoredContent, isEditable, setPreviewVersion])

  const handleSave = useCallback(async (newStatus?: string) => {
    if (!editor || isSaving || previewVersion) return // 🌟 預覽模式下禁止儲存

    if (!navigator.onLine) {
      alert('目前處於離線狀態，請等網路恢復後再儲存喔！\n（別擔心，您的進度已安全暫存在瀏覽器中）');
      return;
    }

    setIsSaving(true)
    setSaveStatus('儲存中...')

    const titleInput = document.getElementById('doc-title') as HTMLInputElement
    const currentTitle = titleInput ? titleInput.value : initialTitle
    const currentContent = editor.getJSON()

    const targetStatus = typeof newStatus === 'string' ? newStatus : chapterStatus

    let versionName = null;
    if (!newStatus) {
      const userInput = window.prompt(
          "請為這次的存檔命名 (選填)：\n例如：第一章初稿、重寫戰鬥場景", 
          ""
      );

      if (userInput === null) return; 

      if (userInput.trim() !== "") {
          versionName = userInput.trim();
      }
    }

    try {
      const res = await fetch(`/api/projects/${novelId}/chapters/${chapterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: currentTitle,
          content: currentContent,
          saveVersion: true,
          commitMsg: `${currentTitle || '未命名章節'} - 手動存檔點`,
          status: targetStatus,
          name: versionName,
          isAutoSave: false
        })
      })

      if (!res.ok) throw new Error("儲存失敗")

      setSaveStatus('● 已儲存')
      setChapterStatus(targetStatus)
      localStorage.removeItem(LOCAL_STORAGE_KEY)
      await fetchVersions(novelId, chapterId)

    } catch (error) {
      console.error(error)
      setSaveStatus('❌ 儲存失敗')
    } finally {
      setIsSaving(false)
    }
  }, [editor, isSaving, novelId, chapterId, initialTitle, fetchVersions, chapterStatus, LOCAL_STORAGE_KEY, previewVersion])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  if (!editor) return null

  const handleToggle = (type: string) => {
    if (type === 'bold') editor.chain().focus().toggleBold().run()
    if (type === 'italic') editor.chain().focus().toggleItalic().run()
    if (type === 'underline') editor.chain().focus().toggleUnderline().run()
  }

  const getButtonClass = (type: string) => {
    const isActive = editor.isActive(type)
    return `w-8 h-8 flex items-center justify-center rounded text-lg transition-all active:scale-90 ${
      isActive
        ? 'bg-gray-300 text-blue-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)] ring-1 ring-gray-400/30'
        : 'bg-transparent text-gray-500 hover:bg-gray-100'
    }`
  }

  const getStatusColor = () => {
    if (saveStatus.includes('斷線') || saveStatus.includes('離線')) return 'text-red-500 font-bold';
    if (saveStatus.includes('本機已暫存')) return 'text-blue-500 font-medium';
    if (saveStatus.includes('同步') || saveStatus.includes('連線')) return 'text-purple-600 font-bold';
    if (saveStatus.includes('已儲存')) return 'text-emerald-600 font-medium';
    return 'text-amber-500 font-medium';
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#f8f9fa] overflow-hidden relative">

      {/* 🌟【歷史版本預覽 Banner 提示條】 */}
      {previewVersion && (
        <div className="bg-purple-600 text-white px-6 py-2.5 flex items-center justify-between text-sm shadow-md z-40 animate-in slide-in-from-top duration-200 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold bg-purple-700 border border-purple-400/30 px-2 py-0.5 rounded text-xs flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> 歷史版本預覽中
            </span>
            <span className="text-purple-100">
              儲存時間：{new Date(previewVersion.createdAt).toLocaleString()} （{previewVersion.commitMsg || '手動存檔'}）
            </span>
          </div>

          <button
            onClick={() => setPreviewVersion(null)}
            className="flex items-center gap-1.5 bg-white text-purple-700 hover:bg-purple-50 font-medium px-3 py-1 rounded-lg text-xs transition-colors shadow-sm"
          >
            <EyeOff className="w-3.5 h-3.5" />
            退出預覽
          </button>
        </div>
      )}

      {/* 別人更新了內容的提示 Banner */}
      {externalUpdate && !previewVersion && (
        <div className="bg-amber-100 text-amber-800 px-6 py-2.5 flex items-center justify-between text-sm shadow-md z-40 border-b border-amber-200 animate-in slide-in-from-top duration-300 shrink-0">
          <div className="flex items-center gap-2 font-medium">
            <BellRing className="w-4 h-4 text-amber-600 animate-bounce" />
            <span>✨ <strong>{externalUpdate.authorName}</strong> 剛剛更新了此章節的內容！</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setExternalUpdate(null)}
              className="text-amber-600 hover:text-amber-800 text-xs font-semibold transition-colors"
            >
              先不要 (保留我的)
            </button>
            <button
              onClick={handleLoadExternalUpdate}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm text-xs"
            >
              載入最新版本
            </button>
          </div>
        </div>
      )}

      {/* 頂部工具列 */}
      <div className="w-full flex flex-col bg-white border-b border-gray-200 shadow-sm z-30 shrink-0">
        <div className="flex justify-between items-center px-6 py-3">
          <div className="flex items-center gap-4">

            {!previewVersion && (
              <button
                type="button"
                onClick={() => setIsNotesOpen(!isNotesOpen)}
                className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all border ${
                  isNotesOpen 
                    ? 'bg-amber-100 border-amber-200 text-amber-700 shadow-inner' 
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-amber-500'
                }`}
                title="開關靈感記事板"
              >
                <Lightbulb size={18} className={isNotesOpen ? "fill-amber-200" : ""} />
              </button>
            )}

            <div className="w-16 h-8 bg-blue-600 rounded text-white flex items-center justify-center font-bold text-sm shadow-sm select-none">
              DEMO
            </div>
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2">
                {(!isEditable || previewVersion) && (
                  <span className={`px-2 py-0.5 rounded text-xs font-bold border shadow-sm flex items-center gap-1 select-none ${
                    previewVersion
                      ? 'bg-purple-100 text-purple-700 border-purple-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    🔒 {previewVersion ? '預覽唯讀中' : '唯讀模式'}
                  </span>
                )}

                <input
                  id="doc-title"
                  type="text"
                  defaultValue={initialTitle}
                  disabled={!isEditable || !!previewVersion}
                  onChange={() => {
                    if (previewVersion) return;
                    setSaveStatus('編輯中...');
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => {
                      if (editor) {
                        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
                          title: (document.getElementById('doc-title') as HTMLInputElement).value,
                          content: editor.getJSON()
                        }));
                        setSaveStatus(navigator.onLine ? '本機已暫存' : '⚠️ 離線中 (內容已暫存本機)');
                      }
                    }, 3000);
                  }}
                  autoComplete="off"
                  className={`text-left text-lg font-semibold text-gray-800 border-b bg-transparent px-2 py-0.5 transition-all w-64 focus:outline-none
                    ${isEditable && !previewVersion ? 'border-transparent hover:border-gray-300 focus:border-blue-500' : 'border-transparent opacity-80 cursor-default'}
                  `}
                />
                <div className="flex items-center gap-3 ml-2">
                  {isEditable && !previewVersion && (
                    <span className={`text-xs transition-colors ${getStatusColor()}`}>
                      {saveStatus}
                    </span>
                  )}
                  
                  {/* 字數統計 */}
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100/80 px-2.5 py-1 rounded-md border border-slate-200 shadow-sm select-none flex items-center gap-1.5">
                    {editor.storage.characterCount.characters()} 字
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isEditable && !previewVersion && (
              <>
                <button
                  onClick={() => handleSave(chapterStatus === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED')}
                  disabled={editor.isEmpty || isSaving || !isOnline}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed border ${
                    chapterStatus === 'PUBLISHED'
                      ? 'bg-white text-red-500 border-red-200 hover:bg-red-50'
                      : 'bg-emerald-500 text-white border-transparent hover:bg-emerald-600'
                  }`}
                >
                  {isSaving ? '處理中...' : (chapterStatus === 'PUBLISHED' ? '隱藏此章節' : '公開發布')}
                </button>

                <button
                  onClick={() => handleSave()}
                  disabled={editor.isEmpty || isSaving || !isOnline}
                  className="px-5 py-2 rounded-lg font-semibold transition-all shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700"
                >
                  {isSaving ? '處理中...' : '儲存草稿'}
                </button>
              </>
            )}

            <div className="w-9 h-9 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold cursor-pointer border-2 border-white shadow-sm text-sm select-none ml-2">
              U
            </div>
          </div>
        </div>

        {isEditable && !previewVersion && (
          <div className="flex gap-1.5 px-3 py-1.5 bg-[#edf2fa] rounded-lg mx-6 mb-3 w-max border border-blue-100/50 shadow-sm">
            <button type="button" onClick={() => handleToggle('bold')} className={getButtonClass('bold')} title="粗體 (Ctrl+B)">B</button>
            <button type="button" onClick={() => handleToggle('italic')} className={getButtonClass('italic')} title="斜體 (Ctrl+I)">
              <span className="italic font-serif text-xl">I</span>
            </button>
            <button type="button" onClick={() => handleToggle('underline')} className={getButtonClass('underline')} title="底線 (Ctrl+U)">
              <span className="underline underline-offset-4">U</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-1 w-full overflow-hidden">
        {isNotesOpen && (
          <div className="w-[320px] shrink-0 border-r border-gray-200 bg-white shadow-[4px_0_15px_rgba(0,0,0,0.03)] z-20 animate-in slide-in-from-left duration-300 flex flex-col h-full relative">
            <NotesPanel projectId={novelId} isWidget={true} isEditable={isEditable} />
          </div>
        )}
        <div className="flex-1 w-full overflow-y-auto bg-[#f8f9fa] flex flex-col items-center px-4 custom-scrollbar">
          <div className="w-full max-w-[816px] h-auto shrink-0 bg-white border border-gray-200 shadow-[0_4px_25px_rgba(0,0,0,0.04)] p-[60px] min-h-[1100px] rounded-2xl my-10 transition-all">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {isEditable && !previewVersion && <AssistantChat projectId={novelId} />}
      
    </div>
  )
}