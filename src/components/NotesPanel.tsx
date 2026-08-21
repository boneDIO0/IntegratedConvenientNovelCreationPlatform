'use client'

import { useState, useEffect } from "react";
import { SettingItem } from "@/types";
import { Plus, Trash2, ArrowLeft, BellRing } from "lucide-react";
import { useSession } from "next-auth/react";

// 表單種類
import TextNoteForm from "./TextNoteForm";
import ActStructureForm from "./ActStructureForm";

interface NotesPanelProps {
  projectId: string;
  isWidget?: boolean; 
  isEditable?: boolean;
}

const FORM_REGISTRY: Record<string, { name: string; component: any }> = {
  text_note: {
    name: "純文字筆記",
    component: TextNoteForm
  },
  act_structure: {
    name: "三幕劇大綱",
    component: ActStructureForm
  },
};

export function NotesPanel({ projectId, isWidget = false, isEditable = true }: NotesPanelProps) {
  const [notesData, setNotesData] = useState<{ category: string; items: SettingItem[] }[]>([]);
  const [selectedNote, setSelectedNote] = useState<SettingItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();
  const [externalUpdate, setExternalUpdate] = useState<{ authorName: string, latestData: any } | null>(null);
  
  // 未儲存變更狀態
  const [hasChanges, setHasChanges] = useState(false);

  const ActiveFormComponent = selectedNote 
    ? (FORM_REGISTRY[selectedNote.category]?.component || TextNoteForm) 
    : null;

  const fetchNotes = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/notes?projectId=${projectId}`);
      if (!res.ok) throw new Error('讀取資料失敗');
      const data = await res.json();
      setNotesData(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchNotes();
  }, [projectId]);

  // 離開前的防呆確認
  const confirmLeave = () => {
    if (hasChanges) {
      const isUserSure = window.confirm("⚠️ 您有未儲存的變更！如果離開，目前修改的內容將會消失。確定要離開嗎？");
      if (isUserSure) {
        setHasChanges(false);
        return true;
      }
      return false;
    }
    return true;
  };

  // 攔截關閉瀏覽器分頁 (防呆最高級)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = ''; // 觸發瀏覽器原生的離開確認視窗
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  // 靜默輪詢機制
  const silentFetchNotes = async () => {
    try {
      const listRes = await fetch(`/api/notes?projectId=${projectId}`);
      if (listRes.ok) {
        const listData = await listRes.json();
        setNotesData(listData); 
      }
      
      if (selectedNote) {
        const itemRes = await fetch(`/api/notes/${selectedNote.id}`);
        if (!itemRes.ok) return;
        
        const dbItem = await itemRes.json();
        const dbContent = dbItem.content || {};
        const dbVersions = Array.isArray(dbContent.versions) ? dbContent.versions : [];

        const currentContent = (selectedNote as any).content || {};
        const currentVersions = Array.isArray(currentContent.versions) ? currentContent.versions : [];

        if (dbVersions.length > currentVersions.length) {
          const latestVersion = dbVersions[dbVersions.length - 1];
          
          const isUpdatedByMe = 
            session?.user?.id && 
            latestVersion?.authorId && 
            latestVersion.authorId === session.user.id;

          if (!isUpdatedByMe) {
            setExternalUpdate({
              authorName: latestVersion?.authorName || '其他協作者',
              latestData: dbItem
            });
          }
        }
      }
    } catch (error) {
      console.warn('筆記靜默更新失敗，網路可能不穩');
    }
  };

  useEffect(() => {
    if (!isEditable) return;
    const interval = setInterval(() => {
      silentFetchNotes();
    }, 30 * 1000);
    return () => clearInterval(interval);
  }, [projectId, selectedNote, isEditable, session?.user?.id]);

  const handleLoadExternalUpdate = () => {
    if (!externalUpdate?.latestData) return;
    const isSure = window.confirm("載入最新版本將會覆蓋您畫面上尚未存檔的變更，確定要載入嗎？");
    if (isSure) {
      const dbItem = externalUpdate.latestData;
      const alignedItem = {
        ...dbItem,
        category: selectedNote?.category || 'text_note',
      };
      setSelectedNote(alignedItem);
      setExternalUpdate(null);
      setHasChanges(false); // 載入後清除髒狀態
    }
  };

  const handleRefreshItem = async () => {
    if (!selectedNote) return;
    try {
      const res = await fetch(`/api/notes/${selectedNote.id}`);
      if (res.ok) {
        const dbItem = await res.json();
        const dbContent = dbItem.content || {};
        setSelectedNote({
          ...dbItem,
          ...dbContent,
          name: dbItem.title || dbItem.name,
          category: dbContent.category || selectedNote.category || 'text_note',
          content: dbItem.content 
        });
        setHasChanges(false); // 還原後清除髒狀態
      }
      await fetchNotes();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddNote = async (categoryName: string) => {
    if (!confirmLeave()) return; // 攔截新增動作
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryName: categoryName,
          type: 'text_note', 
          item: { name: "未命名新靈感" },
          projectId: projectId 
        })
      });
      if (res.ok) {
        const newNote = await res.json();
        await fetchNotes();
        setSelectedNote(newNote);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("確定要永久刪除這則筆記嗎？")) return;
    try {
      await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
        setHasChanges(false); // 刪除後清除髒狀態
      }
      await fetchNotes();
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateNote = async (updatedNote: SettingItem) => {
    if (!isEditable) return;

    const userInput = window.prompt(
      "請為這次的筆記存檔命名 (選填)：\n例如：新增第三幕高潮、修改結局走向", 
      ""
    );

    if (userInput === null) return; 
    
    const versionName = userInput.trim() !== "" ? userInput.trim() : null;

    setSelectedNote(updatedNote);
    try {
      const res = await fetch(`/api/notes/${updatedNote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...updatedNote, 
          saveVersion: true, 
          versionName: versionName 
        })
      });

      if (!res.ok) throw new Error("儲存失敗");

      const newlySavedNote = await res.json();
      const dbContent = newlySavedNote.content || {};
      setSelectedNote({
        ...newlySavedNote,
        ...dbContent,
        name: newlySavedNote.title || newlySavedNote.name,
        category: updatedNote.category,
        content: newlySavedNote.content
      });

      await fetchNotes();
      setHasChanges(false); // 儲存成功，清除髒狀態
    } catch (error) {
      console.error("儲存失敗", error);
      alert("儲存失敗，請檢查網路狀態");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-amber-50/20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className={`flex w-full overflow-hidden bg-amber-50/10 ${isWidget ? 'h-[500px] flex-col' : 'h-screen flex-row'}`}>
      
      {(!isWidget || !selectedNote) && (
        <aside className={`${isWidget ? 'w-full flex-1' : 'w-72 border-r border-amber-200'} bg-white flex flex-col`}>
          <div className="p-4 border-b border-amber-100 bg-amber-50">
            <h2 className="text-lg font-bold text-amber-900 flex items-center gap-2">
              💡 靈感記事板
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {notesData.map((group) => (
              <div key={group.category}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider">{group.category}</h3>
                  {isEditable && (
                    <button onClick={() => handleAddNote(group.category)} className="text-amber-500 hover:text-amber-700">
                      <Plus size={14} />
                    </button>
                  )}
                </div>
                <ul className="space-y-1">
                  {group.items.map((note) => (
                    <li key={note.id} className="group relative">
                      <button
                        onClick={() => {
                          if (selectedNote?.id !== note.id && !confirmLeave()) return; // 攔截切換
                          setSelectedNote(note);
                          setExternalUpdate(null); 
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all truncate ${
                          selectedNote?.id === note.id 
                            ? 'bg-amber-100 text-amber-900 font-semibold' 
                            : 'text-slate-600 hover:bg-amber-50 hover:text-amber-800'
                        }`}
                      >
                        {note.name}
                      </button>
                      {isEditable && (
                        <button 
                          onClick={() => handleDeleteNote(note.id)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            
            {notesData.length === 0 && isEditable && (
              <button 
                onClick={() => handleAddNote('靈感碎片')}
                className="w-full py-3 border-2 border-dashed border-amber-200 rounded-xl text-amber-600 text-sm font-semibold hover:bg-amber-50 hover:border-amber-400 transition-all"
              >
                + 建立第一則筆記
              </button>
            )}
          </div>
        </aside>
      )}

      {selectedNote && (
        <main className={`flex-1 flex flex-col min-w-0 bg-white ${isWidget ? 'h-full' : ''}`}>
          {externalUpdate && (
            <div className="bg-amber-100 text-amber-800 px-4 py-2.5 flex flex-col gap-2 text-sm shadow-sm border-b border-amber-200 shrink-0">
              <div className="flex items-center gap-2 font-medium">
                <BellRing className="w-4 h-4 text-amber-600 animate-bounce shrink-0" />
                <span className="truncate">✨ <strong>{externalUpdate.authorName}</strong> 剛更新了此筆記！</span>
              </div>
              <div className="flex items-center gap-2 self-end">
                <button
                  onClick={() => setExternalUpdate(null)}
                  className="text-amber-600 hover:text-amber-800 text-xs font-semibold transition-colors"
                >
                  保留我的
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

          <div className="px-5 py-4 border-b border-amber-100 flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-3 w-full pr-2">
              {isWidget && (
                <button onClick={() => {
                  if (!confirmLeave()) return; // 攔截返回按鈕
                  setSelectedNote(null);
                  setExternalUpdate(null);
                }} className="p-1 hover:bg-amber-100 rounded-md text-amber-700 transition-colors shrink-0">
                  <ArrowLeft size={18} />
                </button>
              )}
              <h1 className="text-lg font-bold text-slate-800 truncate flex-1">
                {selectedNote.name}
                {hasChanges && <span className="text-amber-500 ml-2 text-sm">*未儲存</span>}
              </h1>
            </div>
            
            {isEditable && (
              <select 
                value={selectedNote.category}
                onChange={(e) => {
                  if (!confirmLeave()) return; // 攔截模板切換
                  handleUpdateNote({ ...selectedNote, category: e.target.value })
                }}
                className="text-xs font-semibold px-2 py-1 bg-amber-100 text-amber-700 rounded-md cursor-pointer hover:bg-amber-200 transition-colors outline-none shrink-0 border-r-4 border-transparent"
              >
                {Object.entries(FORM_REGISTRY).map(([key, config]) => (
                  <option key={key} value={key}>{config.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50 custom-scrollbar relative">
            {ActiveFormComponent && (
              <ActiveFormComponent
                key={selectedNote.id}
                item={selectedNote}
                onSave={handleUpdateNote}
                onRefresh={handleRefreshItem}
                isEditable={isEditable}
                onDirty={() => setHasChanges(true)} // 傳遞 onDirty 給子元件
              />
            )}
          </div>
        </main>
      )}

      {!isWidget && !selectedNote && (
        <main className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 min-w-0">
          <div className="w-20 h-20 mb-4 rounded-2xl bg-amber-100 text-amber-500 flex items-center justify-center text-3xl shadow-sm">
            💡
          </div>
          <h2 className="text-lg font-bold text-slate-700 mb-2">點擊左側筆記開始創作</h2>
          <p className="text-sm text-slate-400">在這裡寫下不會出現在正文中的靈感與大綱</p>
        </main>
      )}
    </div>
  );
}