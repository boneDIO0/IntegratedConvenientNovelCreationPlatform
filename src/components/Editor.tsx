'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import CharacterCount from '@tiptap/extension-character-count'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useEditorUI } from '@/contexts/EditorUIContext'
import { useRouter } from 'next/navigation'
import AssistantChat from './AssistantChat'
import { NotesPanel } from '@/components/NotesPanel'
import { SelectionSettingsTooltip } from '@/components/SelectionSettingsTooltip'
import { SettingItem } from '@/types'
import 'katex/dist/katex.min.css'
import { MathExtension } from '@aarkue/tiptap-math-extension'
import { Eye, EyeOff, RotateCcw, BellRing, Lightbulb, ExternalLink, Download, X } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface EditorProps {
  novelId: string;
  chapterId: string;
  initialTitle: string;
  initialContent: any;
  isEditable?: boolean;
  initialStatus?: string;
}

// 🌟 各分類專屬白名單欄位定義
const CATEGORY_ALLOWED_FIELDS: Record<string, string[]> = {
  character: [
    'titles', 'aliases', 'gender', 'age', 'identity',
    'faction', 'alliances', 'appearance', 'personality',
    'background', 'abilities', 'relations', 'description', 'notes'
  ],
  faction: [
    'leader', 'territory', 'headquarters', 'hierarchy',
    'goals', 'color', 'relations', 'description', 'notes'
  ],
  item: [
    'itemType', 'owner', 'rarity', 'effect',
    'resonanceEffect', 'relations', 'description', 'notes'
  ],
  location: [
    'parentId', 'climate', 'geography', 'relations', 'description', 'notes'
  ],
  event: [
    'date', 'location', 'customLocation', 'selectedEraName',
    'participants', 'impact', 'relations', 'description', 'notes'
  ]
};

export default function Editor({ novelId, chapterId, initialTitle, initialContent, isEditable = true, initialStatus = 'DRAFT' }: EditorProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [, setTick] = useState(0)
  const forceUpdate = useCallback(() => setTick(tick => tick + 1), [])
  const [saveStatus, setSaveStatus] = useState('已儲存')
  const [chapterStatus, setChapterStatus] = useState(initialStatus)
  const [isOnline, setIsOnline] = useState(true)
  const { data: session } = useSession();
  const [externalUpdate, setExternalUpdate] = useState<{ authorName: string } | null>(null);
  const knownLatestVersionRef = useRef<string | null>(null);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const [allSettings, setAllSettings] = useState<SettingItem[]>([]);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const {
    versions,
    latestRestoredContent,
    setLatestRestoredContent,
    fetchVersions,
    previewVersion,
    setPreviewVersion,
    selectedSettingItem,
    setSelectedSettingItem,
    openSettingDetail
  } = useEditorUI()

  // 載入設定集資料
  useEffect(() => {
    if (!novelId) return;
    const fetchSettings = async () => {
      try {
        const res = await fetch(`/api/settings?projectId=${novelId}`);
        if (!res.ok) return;
        const data = await res.json();
        
        const extractItems = (obj: any): SettingItem[] => {
          if (!obj) return [];
          if (Array.isArray(obj)) {
            return obj.flatMap(item => extractItems(item));
          }
          if (typeof obj === 'object') {
            if (obj.id && (obj.name || obj.title)) {
              return [obj];
            }
            const list = obj.items || obj.entities || obj.settingItems || obj.data || obj.groups || obj.settingGroups;
            if (Array.isArray(list)) {
              return list.flatMap(item => extractItems(item));
            }
          }
          return [];
        };

        const flatList = extractItems(data);
        setAllSettings(flatList);
      } catch (err) {
        console.error("載入設定集供編輯器反查失敗:", err);
      }
    };
    fetchSettings();
  }, [novelId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      if (previewVersion) return;

      setSaveStatus('編輯中...')

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

  useEffect(() => {
    if (!editor) return

    const titleInput = document.getElementById('doc-title') as HTMLInputElement

    if (previewVersion) {
      if (!draftBackupRef.current) {
        draftBackupRef.current = {
          title: titleInput ? titleInput.value : initialTitle,
          content: editor.getJSON()
        }
      }

      editor.commands.setContent(previewVersion.content || {})
      editor.setEditable(false)

    } else {
      if (draftBackupRef.current) {
        editor.commands.setContent(draftBackupRef.current.content)
        if (titleInput) {
          titleInput.value = draftBackupRef.current.title
        }
        draftBackupRef.current = null
      }

      editor.setEditable(isEditable)
    }
  }, [previewVersion, editor, isEditable, initialTitle])

  useEffect(() => {
    if (!isEditable || previewVersion) return;

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

  useEffect(() => {
    if (!isEditable || previewVersion) return;

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

  useEffect(() => {
    if (!isEditable || previewVersion) return;

    const pollingInterval = setInterval(() => {
      if (navigator.onLine) {
        fetchVersions(novelId, chapterId);
      }
    }, 20 * 1000);

    return () => clearInterval(pollingInterval);
  }, [isEditable, previewVersion, novelId, chapterId, fetchVersions]);

  useEffect(() => {
    if (versions.length > 0) {
      const latest = versions[0];

      if (!knownLatestVersionRef.current) {
        knownLatestVersionRef.current = latest.id;
        return;
      }

      if (latest.id !== knownLatestVersionRef.current) {
        if (session?.user?.id && latest.authorId !== session.user.id) {
          setExternalUpdate({
            authorName: latest.author?.name || '其他協作者'
          });
        }
        knownLatestVersionRef.current = latest.id;
      }
    }
  }, [versions, session?.user?.id]);

  const handleLoadExternalUpdate = async () => {
    if (!editor) return;
    if (!confirm("載入最新版本將會覆蓋您畫面上尚未存檔的內容，確定要載入嗎？")) return;

    try {
      const res = await fetch(`/api/projects/${novelId}/chapters/${chapterId}`);
      if (res.ok) {
        const data = await res.json();
        
        editor.commands.setContent(data.content || {});
        const titleInput = document.getElementById('doc-title') as HTMLInputElement;
        if (titleInput && data.title) titleInput.value = data.title;
        
        setExternalUpdate(null);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        setSaveStatus('● 已載入最新進度');
      }
    } catch (error) {
      console.error("載入最新進度失敗", error);
      alert("載入失敗，請檢查網路狀態");
    }
  };

  useEffect(() => {
    if (editor && latestRestoredContent) {
      editor.commands.setContent(latestRestoredContent)
      draftBackupRef.current = null
      setPreviewVersion(null)
      editor.setEditable(isEditable)
      setLatestRestoredContent(null)
      setSaveStatus('● 已還原版本並儲存')
    }
  }, [latestRestoredContent, editor, setLatestRestoredContent, isEditable, setPreviewVersion])

  const handleSave = useCallback(async (newStatus?: string) => {
    if (!editor || isSaving || previewVersion) return

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

      {/* 歷史版本預覽 Banner 提示條 */}
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
            className="flex items-center gap-1.5 bg-white text-purple-700 hover:bg-purple-50 font-medium px-3 py-1 rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
          >
            <EyeOff className="w-3.5 h-3.5" />
            退出預覽
          </button>
        </div>
      )}

      {/* 協作者更新提示 Banner */}
      {externalUpdate && !previewVersion && (
        <div className="bg-amber-100 text-amber-800 px-6 py-2.5 flex items-center justify-between text-sm shadow-md z-40 border-b border-amber-200 animate-in slide-in-from-top duration-300 shrink-0">
          <div className="flex items-center gap-2 font-medium">
            <BellRing className="w-4 h-4 text-amber-600 animate-bounce" />
            <span>✨ <strong>{externalUpdate.authorName}</strong> 剛剛更新了此章節的內容！</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setExternalUpdate(null)}
              className="text-amber-600 hover:text-amber-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              先不要 (保留我的)
            </button>
            <button
              onClick={handleLoadExternalUpdate}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm text-xs cursor-pointer"
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
                className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all border cursor-pointer ${
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
                  className={`px-4 py-2 rounded-lg font-semibold transition-all shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed border cursor-pointer ${
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
                  className="px-5 py-2 rounded-lg font-semibold transition-all shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                >
                  {isSaving ? '處理中...' : '儲存草稿'}
                </button>
              </>
            )}

            <div className="relative ml-2" ref={exportMenuRef}>
              <button
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors shadow-sm border cursor-pointer ${
                  isExportMenuOpen 
                    ? 'bg-slate-200 border-slate-300 text-slate-700' 
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                }`}
                title="匯出整部作品"
              >
                <Download size={18} />
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden flex flex-col py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-2 text-xs font-bold text-slate-400 border-b border-slate-100 bg-slate-50/50">
                    匯出整部作品
                  </div>
                  <a
                    href={`/api/projects/${novelId}/export?format=txt`}
                    download
                    onClick={() => setIsExportMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    📄 純文字 (TXT)
                  </a>
                  <a
                    href={`/api/projects/${novelId}/export?format=docx`}
                    download
                    onClick={() => setIsExportMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    📘 Word (DOCX)
                  </a>
                </div>
              )}
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

      <div className="flex flex-1 w-full overflow-hidden relative">
        {isNotesOpen && (
          <div className="w-[320px] shrink-0 border-r border-gray-200 bg-white shadow-[4px_0_15px_rgba(0,0,0,0.03)] z-20 animate-in slide-in-from-left duration-300 flex flex-col h-full relative">
            <NotesPanel projectId={novelId} isWidget={true} isEditable={isEditable} />
            <div className="mt-auto p-4 border-t border-amber-100 bg-amber-50/50 shrink-0">
              <button
                onClick={() => window.open(`/novel_list/${novelId}/notes`, '_blank')}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-amber-200 rounded-xl text-amber-700 text-sm font-bold shadow-sm hover:bg-amber-100 hover:border-amber-300 transition-all group cursor-pointer"
              >
                <span>展開全域故事大綱</span> 
                <ExternalLink size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* 編輯器容器與選取懸浮卡片 */}
        <div 
          ref={editorContainerRef} 
          className="flex-1 w-full overflow-y-auto bg-[#f8f9fa] flex flex-col items-center px-4 custom-scrollbar relative"
        >
          <div className="w-full max-w-[816px] h-auto shrink-0 bg-white border border-gray-200 shadow-[0_4px_25px_rgba(0,0,0,0.04)] p-[60px] min-h-[1100px] rounded-2xl my-10 transition-all">
            <EditorContent editor={editor} />
          </div>

          <SelectionSettingsTooltip 
            allSettings={allSettings}
            containerRef={editorContainerRef}
            onOpenDetail={(item) => {
              openSettingDetail({ ...item });
            }}
          />
        </div>

        {/* 🌟 編輯器內部直連抽屜 */}
        {selectedSettingItem && (() => {
          const item = selectedSettingItem as any;
          const rawContent = item.content && typeof item.content === 'object' ? item.content : {};
          const category = (item.category || item.type || 'custom').toLowerCase();
          const allowedKeys = CATEGORY_ALLOWED_FIELDS[category];

          // 🌟 正確提取 titles
          const rawTitles = rawContent.titles || item.titles || (Array.isArray(item.title) ? item.title : undefined);
          const realTitles = Array.isArray(rawTitles)
            ? rawTitles.map((t: any) => String(t).trim()).filter((t: string) => t !== '' && t !== item.name)
            : (typeof rawTitles === 'string' && rawTitles.trim() !== '' && rawTitles.trim() !== item.name ? [rawTitles.trim()] : []);

          const mergedContent: Record<string, any> = {
            ...item,
            ...rawContent,
            titles: realTitles
          };

          const excludeKeys = [
            'id', 'projectId', 'category', 'formType', 'type', 'versions',
            'createdAt', 'updatedAt', 'name', 'title', 'deletedAt',
            'isChapterAssigned', 'isAssigned', 'chapters', 'content',
            'selectedEraName', 'sortWeight', 'matchScore', 'locationId'
          ];

          const FIELD_LABEL_MAP: Record<string, string> = {
            description: '詳細說明',
            summary: '摘要說明',
            notes: '備註與註記',
            date: '發生時間',
            location: '發生地點',
            relations: '關聯角色 / 要素',
            participants: '參與人員',
            impact: '影響與結果',
            titles: '頭銜 / 稱號',
            aliases: '別名 / 別稱',
            age: '年齡',
            gender: '性別',
            identity: '身分',
            appearance: '外貌特徵',
            personality: '性格特點',
            background: '背景故事',
            abilities: '能力 / 技能',
            alliances: '所屬組織',
            faction: '所屬勢力',
            leader: '首領 / 領導者',
            headquarters: '據點 / 總部',
            goals: '組織目標',
            rarity: '稀有度',
            owner: '持有者',
            effect: '效果 / 功能',
            itemType: '物品類型',
            resonanceEffect: '共鳴效果 / 特殊機制',
            climate: '風土氣候設定',
            geography: '地理環境',
            color: '關係圖專屬色彩',
            hierarchy: '組織架構 / 階級',
            territory: '勢力範圍 / 領地',
            parentId: '隸屬大分區',
          };

          // 🎯 名稱反查函式：僅比對 ID 與 Name
          const resolveSettingName = (val: any): string => {
            if (!val) return '';
            const str = String(val).trim();
            if (!str) return '';

            const matched = allSettings.find(s => s.id === str || s.name?.trim().toLowerCase() === str.toLowerCase());
            return matched ? (matched.name || (matched as any).title || str) : str;
          };

          const validEntries = Object.entries(mergedContent).filter(([k, v]) => {
            if (excludeKeys.includes(k) || k === 'title') return false;
            if (allowedKeys && !allowedKeys.includes(k)) return false;
            if (v === undefined || v === null || v === '') return false;
            if (Array.isArray(v) && v.length === 0) return false;
            return true;
          });

          return (
            <aside className="fixed right-0 top-14 h-[calc(100vh-56px)] w-96 bg-white border-l border-slate-200 z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded shrink-0">
                    {item.category?.toUpperCase() || 'SETTING'}
                  </span>
                  <h3 className="font-bold text-slate-800 truncate">
                    {item.name || item.title || "未命名設定"}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedSettingItem(null)}
                  className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {validEntries.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-12">
                    尚無更詳細的屬性設定
                  </div>
                ) : (
                  validEntries.map(([key, value]) => {
                    const label = FIELD_LABEL_MAP[key] || key;
                    let displayVal = value;

                    // 🎯 1. 反查組織、陣營、地點
                    if (['faction', 'alliances', 'parentId', 'locationId'].includes(key)) {
                      displayVal = resolveSettingName(value);
                    }

                    // 🎯 2. 反查關聯人名
                    else if (key === 'relations' && Array.isArray(value)) {
                      displayVal = value.map((r: any) => {
                        if (typeof r === 'object' && r !== null) {
                          const relType = r.type || r.relation || '關聯';
                          const rawTarget = r.targetId || r.targetName || r.name || '';
                          const targetName = resolveSettingName(rawTarget) || '未知目標';
                          return `• [${relType}] ${targetName}`;
                        }
                        return `• ${resolveSettingName(r)}`;
                      }).join('\n');
                    } else if (Array.isArray(value)) {
                      // 🌟 修正：一般陣列直接轉純字串，絕不走 resolveSettingName
                      displayVal = value.map((v: any) => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(', ');
                    } else if (typeof value === 'object' && value !== null) {
                      displayVal = JSON.stringify(value, null, 2);
                    }

                    return (
                      <div key={key} className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1">
                        <span className="text-[11px] font-bold text-slate-500">{label}</span>
                        <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                          {String(displayVal)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-3 border-t border-slate-100 bg-slate-50 shrink-0">
                <a
                  href={`/novel_list/${novelId}/settings`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 w-full py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 transition-all shadow-sm"
                >
                  <span>在後台完整編輯</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </aside>
          );
        })()}
      </div>

      {isEditable && !previewVersion && <AssistantChat projectId={novelId} />}
      
    </div>
  )
}