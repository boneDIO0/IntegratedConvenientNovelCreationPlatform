'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useEditorUI } from '@/contexts/EditorUIContext'
import AssistantChat from './AssistantChat'
import 'katex/dist/katex.min.css'
import { MathExtension } from '@aarkue/tiptap-math-extension'

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

  // 📍 自動存檔相關變數
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const LOCAL_STORAGE_KEY = `editor_draft_${novelId}_${chapterId}`

  const editor = useEditor({
    extensions: [StarterKit, Underline, MathExtension.configure({ evaluation: false })],
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
      setSaveStatus('編輯中...') 
      
      // 📍 機制 1：打字停頓 3 秒後，存入 LocalStorage
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      
      typingTimeoutRef.current = setTimeout(() => {
        const content = editor.getJSON()
        const titleInput = document.getElementById('doc-title') as HTMLInputElement
        const currentTitle = titleInput ? titleInput.value : initialTitle

        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ title: currentTitle, content }))
        setSaveStatus('本機已暫存') // 提示使用者資料已不會遺失
      }, 3000)
    }
  })

  const { latestRestoredContent, setLatestRestoredContent, fetchVersions } = useEditorUI()

  // 📍 機制 2：每 3 分鐘自動從 LocalStorage 撈取最新資料，靜默存入 DB
  useEffect(() => {
    if (!isEditable) return; 

    const autoSaveInterval = setInterval(async () => {
      const draftData = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (!draftData || !editor || isSaving) return; // 如果本機沒新進度，或正在存檔，就跳過

      try {
        const { title, content } = JSON.parse(draftData)
        setSaveStatus('自動儲存中...')

        const res = await fetch(`/api/projects/${novelId}/chapters/${chapterId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title,
            content: content,
            saveVersion: false, // 🌟 核心：告訴後端這只是自動存檔，不要生出歷史紀錄
            status: chapterStatus 
          })
        })

        if (res.ok) {
          setSaveStatus('● 已儲存')
          localStorage.removeItem(LOCAL_STORAGE_KEY) // 存進資料庫後，清空本機暫存
        }
      } catch (error) {
        console.error('自動存檔失敗', error)
        setSaveStatus('⚠️ 自動存檔失敗')
      }
    }, 3 * 60 * 1000) // 3 分鐘 (180,000 毫秒)

    return () => clearInterval(autoSaveInterval)
  }, [editor, isSaving, novelId, chapterId, chapterStatus, isEditable, LOCAL_STORAGE_KEY])

  // 📍 機制 3：監聽使用者「切換分頁」或「關閉網頁」的瞬間，強制發送存檔請求
  useEffect(() => {
    if (!isEditable) return;

    const handleVisibilityChange = () => {
      // document.visibilityState === 'hidden' 代表使用者切換了分頁，或正在關閉視窗
      if (document.visibilityState === 'hidden') {
        const draftData = localStorage.getItem(LOCAL_STORAGE_KEY)
        
        // 如果本機有暫存資料，代表有還沒存進資料庫的新進度
        if (draftData) {
          const { title, content } = JSON.parse(draftData)

          // 🚨 注意：這裡千萬不能用普通的 async/await fetch，瀏覽器會直接砍斷請求！
          // 必須加上 keepalive: true，瀏覽器就會在背景默默幫你把這個 API 打完
          fetch(`/api/projects/${novelId}/chapters/${chapterId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: title,
              content: content,
              saveVersion: true, // 🌟 視窗切換通常代表一個段落的結束，趁機生一個歷史紀錄
              commitMsg: "系統自動存檔 (離開網頁)",
              status: chapterStatus
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
  }, [novelId, chapterId, chapterStatus, isEditable, LOCAL_STORAGE_KEY]);


  useEffect(() => {
    if (editor && latestRestoredContent) {
      editor.commands.setContent(latestRestoredContent)
      setLatestRestoredContent(null)
      setSaveStatus('● 已儲存') 
    }
  }, [latestRestoredContent, editor, setLatestRestoredContent])

  const handleSave = useCallback(async (newStatus?: string) => {
    if (!editor || isSaving) return
    
    setIsSaving(true) 
    setSaveStatus('儲存中...')

    const titleInput = document.getElementById('doc-title') as HTMLInputElement
    const currentTitle = titleInput ? titleInput.value : initialTitle
    const currentContent = editor.getJSON()
    
    const targetStatus = typeof newStatus === 'string' ? newStatus : chapterStatus

    try {
      const res = await fetch(`/api/projects/${novelId}/chapters/${chapterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: currentTitle,
          content: currentContent,
          saveVersion: true, // 🌟 手動存檔，要求後端生出歷史紀錄
          commitMsg: `${currentTitle || '未命名章節'} - 手動存檔點`,
          status: targetStatus 
        })
      })

      if (!res.ok) throw new Error("儲存失敗")

      setSaveStatus('● 已儲存')
      setChapterStatus(targetStatus) 
      localStorage.removeItem(LOCAL_STORAGE_KEY) // 📍 手動存檔成功後，清空本機暫存
      await fetchVersions(novelId, chapterId)

    } catch (error) {
      console.error(error)
      setSaveStatus('❌ 儲存失敗')
    } finally {
      setIsSaving(false) 
    }
  }, [editor, isSaving, novelId, chapterId, initialTitle, fetchVersions, chapterStatus, LOCAL_STORAGE_KEY])

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

  return (
    <div className="flex flex-col w-full h-full bg-[#f8f9fa] overflow-hidden relative">
      <div className="w-full flex flex-col bg-white border-b border-gray-200 shadow-sm z-30 shrink-0">
        <div className="flex justify-between items-center px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="w-16 h-8 bg-blue-600 rounded text-white flex items-center justify-center font-bold text-sm shadow-sm select-none">
              DEMO
            </div>
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2">
                {!isEditable && (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs font-bold border border-slate-200 shadow-sm flex items-center gap-1 select-none">
                    🔒 唯讀模式
                  </span>
                )}

                <input 
                  id="doc-title" 
                  type="text" 
                  defaultValue={initialTitle} 
                  disabled={!isEditable}
                  onChange={() => {
                    setSaveStatus('編輯中...');
                    // 標題改變時也強制重置 3 秒計時器存本機
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => {
                      if (editor) {
                        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ 
                          title: (document.getElementById('doc-title') as HTMLInputElement).value, 
                          content: editor.getJSON() 
                        }));
                        setSaveStatus('本機已暫存');
                      }
                    }, 3000);
                  }}
                  autoComplete="off"
                  className={`text-left text-lg font-semibold text-gray-800 border-b bg-transparent px-2 py-0.5 transition-all w-64 focus:outline-none
                    ${isEditable ? 'border-transparent hover:border-gray-300 focus:border-blue-500' : 'border-transparent opacity-80 cursor-default'}
                  `}
                />
                {isEditable && (
                  <span className={`text-xs font-semibold transition-colors ${saveStatus.includes('本機已暫存') ? 'text-blue-500' : saveStatus.includes('已儲存') ? 'text-emerald-600' : 'text-amber-500'}`}>
                    {saveStatus}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isEditable && (
              <>
                <button 
                  onClick={() => handleSave(chapterStatus === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED')}
                  disabled={editor.isEmpty || isSaving}
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
                  disabled={editor.isEmpty || isSaving}
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

        {isEditable && (
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

      <div className="flex-1 w-full overflow-y-auto bg-[#f8f9fa] flex flex-col items-center px-4 custom-scrollbar">
        <div className="w-full max-w-[816px] h-auto shrink-0 bg-white border border-gray-200 shadow-[0_4px_25px_rgba(0,0,0,0.04)] p-[60px] min-h-[1100px] rounded-2xl my-10 transition-all">
          <EditorContent editor={editor} />
        </div>
      </div>
      
      {isEditable && <AssistantChat projectId={novelId} />}
      
    </div>
  )
}