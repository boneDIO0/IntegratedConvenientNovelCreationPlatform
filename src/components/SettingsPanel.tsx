'use client'

import { useState, useEffect } from "react";
import SettingsSidebar from "@/components/SettingsSidebar";
import CharacterForm from "@/components/CharacterForm";
import RelationGraph from "@/components/RelationGraph"; 
import { SettingItem } from "@/lib/mockSettings";
import { PLATFORM_TEMPLATES, TemplateDef } from "@/lib/templates"; 
import FactionForm from "@/components/FactionForm";
import ItemForm from "@/components/ItemForm";
import EventForm from "@/components/EventForm";
import TimelineView from "@/components/TimelineView";
import DynamicForm from "@/components/DynamicForm";
import { CalendarConfig } from "@/lib/calendarEngine"; 
// 🌟 核心新增：載入剛剛寫好的世界觀曆法自定義配置表單
import CalendarConfigForm from "@/components/CalendarConfigForm"; 

interface SettingsPanelProps {
  projectId: string;
  chapterId?: string;
}

export function SettingsPanel({ projectId, chapterId }: SettingsPanelProps) {
  const [settingsData, setSettingsData] = useState<{ category: string; items: SettingItem[] }[]>([]);
  const [globalAllSettings, setGlobalAllSettings] = useState<{ category: string; items: SettingItem[] }[]>([]);
  const [selectedItem, setSelectedItem] = useState<SettingItem | null>(null);
  const [calendarConfig, setCalendarConfig] = useState<CalendarConfig | undefined>(undefined);

  const [viewMode, setViewMode] = useState<'form' | 'graph' | 'timeline' | 'chapter_manager'>(
    chapterId ? 'chapter_manager' : 'form'
  );
  
  const [highlightedIds, setHighlightedIds] = useState<string[] | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true); 
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncingChapter, setIsSyncingChapter] = useState(false); 

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      
      // 非同步拉取專案專屬的自定義世界觀曆法配置
      const calendarRes = await fetch(`/api/projects/${projectId}/calendar`);
      if (calendarRes.ok) {
        const calendarResult = await calendarRes.json();
        if (calendarResult.status === "success") {
          setCalendarConfig(calendarResult.data);
        }
      }

      let url = `/api/settings?projectId=${projectId}`;
      if (chapterId) {
        url += `&chapterId=${chapterId}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('讀取資料失敗');
      const data = await res.json();
      setSettingsData(data);

      const globalRes = await fetch(`/api/settings?projectId=${projectId}`);
      if (globalRes.ok) {
        const globalData = await globalRes.json();
        setGlobalAllSettings(globalData);
        
        if (globalData && globalData.length > 0) {
          setIsInitialized(true);
        } else {
          setIsInitialized(false);
        }
      }
    } catch (error) {
      console.error('無法連線到資料庫:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchSettings();
      if (chapterId) {
        setViewMode('chapter_manager');
        setSelectedItem(null);
      }
    }
  }, [projectId, chapterId]); 

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#editor') {
        if (!chapterId) {
          setIsInitialized(true);
        }
      } else if (settingsData.length === 0) {
        setIsInitialized(false);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [settingsData.length, chapterId]);

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

  const handleToggleSettingToChapter = async (entityId: string, isChecked: boolean) => {
    if (!chapterId) return;
    try {
      setIsSyncingChapter(true);
      const res = await fetch(`/api/settings`, {
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isChecked ? 'connect_chapter' : 'disconnect_chapter',
          chapterId: chapterId,
          entityId: entityId
        })
      });

      if (!res.ok) throw new Error('同步章節設定失敗');
      await fetchSettings();
    } catch (error) {
      console.error(error);
      alert('⚠️ 關聯章節要素失敗，請確認資料庫狀態。');
    } finally {
      setIsSyncingChapter(false);
    }
  };

  const handleUpdateItem = async (updatedItem: SettingItem) => {
    setSettingsData(prevData => {
      return prevData.map(group => {
        if (group.items.some(i => i.id === updatedItem.id)) {
          return {
            ...group,
            items: group.items.map(item => item.id === updatedItem.id ? updatedItem : item)
          };
        }
        return group;
      });
    });
    
    setGlobalAllSettings(prevGlobal => {
      return prevGlobal.map(group => {
        if (group.items.some(i => i.id === updatedItem.id)) {
          return {
            ...group,
            items: group.items.map(item => item.id === updatedItem.id ? updatedItem : item)
          };
        }
        return group;
      });
    });
    
    setSelectedItem(updatedItem); 
    setHasChanges(false); 

    try {
      const res = await fetch(`/api/settings/${updatedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem)
      });
      
      if (!res.ok) throw new Error("後端儲存失敗");
      console.log("🎉 組織設定已成功同步至 Neon 雲端資料庫！");
    } catch (error) {
      console.error("雲端同步出錯:", error);
    }
  };

  const handleSelectTemplate = async (template: TemplateDef) => {
    setSettingsData(template.initialData); 
    window.location.hash = 'editor';
    setIsInitialized(true);
  };

  const handleEventHighlight = (ids: string[]) => {
    if (!confirmLeave()) return; 
    setHighlightedIds(ids);
    setViewMode('graph'); 
  };

  const handleNodeSelectFromGraph = (nodeId: string) => {
    if (nodeId === "project-calendar-config") return; // 防呆：點擊關係圖節點排除曆法設定項目
    for (const group of settingsData) {
      const found = group.items.find(item => item.id === nodeId);
      if (found) {
        setSelectedItem(found);
        setViewMode('form'); 
        setHasChanges(false); 
        break;
      }
    }
  };

  const handleAddItem = async (categoryName: string, type: string) => {
    if (!confirmLeave()) return; 
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryName: categoryName,
          type: type, 
          item: { name: "未命名新項目" },
          projectId: projectId 
        })
      });

      if (!res.ok) throw new Error('新增至資料庫失敗');
      const realItem = await res.json(); 

      if (chapterId) {
        await fetch(`/api/settings`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'connect_chapter', chapterId, entityId: realItem.id })
        });
      }

      await fetchSettings(); 
      setSelectedItem(realItem);
      setViewMode('form');
      setHasChanges(false); 
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("⚠️ 確定要永久刪除此設定項目嗎？這將會一併解除所有章節的登場勾選，且無法復原。")) return;
    setSettingsData(prevData => {
      return prevData.map(group => ({
        ...group,
        items: group.items.filter(item => item.id !== itemId)
      }));
    });
    setGlobalAllSettings(prevGlobal => {
      return prevGlobal.map(group => ({
        ...group,
        items: group.items.filter(item => item.id !== itemId)
      }));
    });
    if (selectedItem?.id === itemId) {
      setSelectedItem(null);
      if (chapterId) setViewMode('chapter_manager');
    }
    try {
      const res = await fetch(`/api/settings/${itemId}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }) 
      });

      if (!res.ok) throw new Error("資料庫刪除失敗");
      console.log(`🎉 ID: ${itemId} 及其所有章節登場關聯已從雲端 Neon 完美抹除！`);
    } catch (error) {
      console.error("刪除雲端同步失敗:", error);
      alert("⚠️ 雲端刪除失敗，請重新整理網頁檢查 Neon 資料庫狀態。");
    }
  };

  const handleAddCategory = async (newCategoryName: string) => {
    if (!newCategoryName.trim()) return;
    setSettingsData(prev => [...prev, { category: newCategoryName, items: [] }]);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'new_category', name: newCategoryName, projectId })
      });
    } catch (error) {}
  };

  const handleDeleteCategory = async (categoryName: string) => {
    if (confirm(`確定要刪除「${categoryName}」目錄嗎？`)) {
      setSettingsData(prev => prev.filter(g => g.category !== categoryName));
      setSelectedItem(null);
      if (chapterId) setViewMode('chapter_manager');
      try {
        await fetch('/api/settings', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete_category', categoryName, projectId })
        });
      } catch (error) {}
    }
  };

  const handleRenameCategory = async (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return;
    setSettingsData(prev => prev.map(g => g.category === oldName ? { ...g, category: newName } : g));
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename_category', oldName, newName, projectId })
      });
    } catch (error) {}
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900 mb-4"></div>
        <p className="text-sm text-slate-500 font-medium">正在連線雲端資料庫...</p>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-slate-900">建立你的新專案</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLATFORM_TEMPLATES.map((template) => (
              <button key={template.id} onClick={() => handleSelectTemplate(template)} className="p-6 bg-white border rounded-xl text-left">
                <h3 className="text-xl font-bold text-slate-800 mb-2">{template.name}</h3>
                <p className="text-slate-500 text-sm">{template.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 md:flex-row flex-col">
      <aside className="w-full md:w-80 border-r border-slate-200 bg-white p-4 overflow-y-auto hidden md:block">
        <h2 className="text-xl font-bold mb-4 text-slate-800">設定集目錄</h2>
        <SettingsSidebar 
          data={settingsData}
          onSelect={(item) => {
            if (!confirmLeave()) return; 
            setSelectedItem(item);
            setViewMode('form'); 
            setHasChanges(false); 
          }} 
          selectedId={selectedItem?.id} 
          onAdd={handleAddItem}
          onDelete={handleDeleteItem}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
          onRenameCategory={handleRenameCategory}
        />
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col">
        <div className="mx-auto w-full max-w-5xl flex-1 flex flex-col">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-slate-800">
                {viewMode === 'graph' ? '全域人物關係圖' : 
                 viewMode === 'chapter_manager' ? '🎬 本章登場要素配置' :
                 selectedItem ? `${selectedItem.name} ${hasChanges ? '*(已修改)' : '(編輯中)'}` : "未選取項目"}
              </h1>

              {/* 🌟 核心優化 1：如果是曆法特殊設定，隱藏常規類型切換 Select，防止使用者洗掉 JSON 結構 */}
              {selectedItem && selectedItem.id !== "project-calendar-config" && (viewMode === 'form' || !viewMode) && (
                <select
                  value={selectedItem.category}
                  onChange={(e) => {
                    const newType = e.target.value;
                    const updated = { ...selectedItem, category: newType };
                    setSelectedItem(updated);
                    handleUpdateItem(updated); 
                    setHasChanges(true); 
                  }}
                  className="text-sm font-medium border border-slate-200 rounded-md px-3 py-1.5 bg-white text-slate-600 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer shadow-sm"
                >
                  <option value="character">👤 人物表單</option>
                  <option value="faction">🏛️ 組織表單</option>
                  <option value="item">⚔️ 物品表單</option>
                  <option value="event">📜 事件表單</option>
                  <option value="custom">⚙️ 通用表單</option>
                </select>
              )}
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => { if (!confirmLeave()) return; setViewMode('timeline'); setHighlightedIds(null); }}
                className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'timeline' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
              >
                ⏳ 歷史時間軸
              </button>

              <button 
                onClick={() => { if (!confirmLeave()) return; setViewMode('graph'); setHighlightedIds(null); }}
                className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'graph' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
              >
                🗺️ 檢視關係圖
              </button>

              {chapterId && (
                <button 
                  onClick={() => { if (!confirmLeave()) return; setViewMode('chapter_manager'); setSelectedItem(null); }}
                  className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'chapter_manager' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                >
                  🎬 本章登場管理
                </button>
              )}
              
              {!chapterId && (
                <button 
                  onClick={() => setViewMode('form')}
                  className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'form' ? 'bg-slate-100 text-slate-900 border-slate-300' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                >
                  📝 返回編輯器
                </button>
              )}
            </div>
          </div>
          
          <div className="flex-1 min-h-[600px] flex">
             {viewMode === 'timeline' ? (
                <TimelineView 
                  allSettings={globalAllSettings}       // 🌟 傳入動態的全域設定總表
                  calendarConfig={calendarConfig}       // 🌟 傳入從雲端資料庫撈出來的多紀元設定
                  filterTargetId={selectedItem?.id}     // 🌟 傳入當前選取的項目（若無則為全域時間軸）
                  onEventClick={handleEventHighlight}   // 🌟 綁定點擊跳轉關係圖的高亮連動
                />
             ) : viewMode === 'graph' ? (
                <RelationGraph allSettings={globalAllSettings} highlightedIds={highlightedIds} onNodeSelect={handleNodeSelectFromGraph} />
             ) : viewMode === 'chapter_manager' ? (
                <div className="w-full rounded-lg border border-slate-200 bg-white p-8 shadow-sm flex flex-col space-y-6 overflow-y-auto max-h-[700px]">
                  <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-1">🎬 本章登場設定管理</h3>
                      <p className="text-sm text-slate-500">
                        勾選下方項目以將角色、組織或道具拉入本章快捷側邊欄。未勾選的項目將在寫作時隱藏。
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedItem(null);
                        const firstItem = settingsData.flatMap(g => g.items)[0];
                        if (firstItem) {
                          setSelectedItem(firstItem);
                          setViewMode('form');
                          setHasChanges(false);
                        } else {
                          setViewMode('form'); 
                        }
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg shadow-sm transition-all whitespace-nowrap"
                    >
                      ✨ 完成配置
                    </button>
                  </div>

                  {isSyncingChapter && (
                    <div className="text-xs bg-blue-50 text-blue-600 px-3 py-2 rounded-lg animate-pulse font-medium">
                      ⏳ 正在同步章節關係網路至雲端 Neon...
                    </div>
                  )}

                  <div className="space-y-6 flex-1">
                    {globalAllSettings.map((group) => (
                      <div key={group.category} className="space-y-3">
                        <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">
                          {group.category}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {group.items.map((item) => {
                            const isAssigned = settingsData
                              .flatMap((g) => g.items)
                              .some((i) => i.id === item.id);

                            return (
                              <label key={item.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${isAssigned ? 'border-blue-500 bg-blue-50/40 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                <div className="flex items-center gap-3">
                                  <div className={`w-2 h-2 rounded-full ${item.category === 'character' ? 'bg-blue-500' : item.category === 'faction' ? 'bg-orange-500' : 'bg-emerald-500'}`} />
                                  <span className="text-sm font-semibold text-slate-800">{item.name}</span>
                                </div>
                                <input 
                                  type="checkbox"
                                  checked={isAssigned}
                                  disabled={isSyncingChapter}
                                  onChange={(e) => handleToggleSettingToChapter(item.id, e.target.checked)}
                                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
             ) : selectedItem ? (
                <div className="w-full rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
                  {/* 🌟 核心優化 2：攔截並優先處理世界觀曆法配置面板分支 */}
                  {selectedItem.id === "project-calendar-config" ? (
                    <CalendarConfigForm 
                      projectId={projectId}
                      initialConfig={calendarConfig}
                      onSaveSuccess={() => {
                        fetchSettings();
                        setHasChanges(false); // 儲存成功，清除父層已修改標籤
                    }}
                    onDirty={() => setHasChanges(true)}
                    />
                  ) : (
                    <>
                      {selectedItem.category === 'character' && (
                        <CharacterForm 
                          key={selectedItem.id} 
                          item={selectedItem} 
                          onSave={handleUpdateItem} 
                          allSettings={globalAllSettings} 
                          currentChapterSettings={settingsData}
                          onDirty={() => setHasChanges(true)}
                        />
                      )}
                      {selectedItem.category === 'faction' && (
                        <FactionForm 
                          key={selectedItem.id} 
                          item={selectedItem} 
                          onSave={handleUpdateItem} 
                          onDirty={() => setHasChanges(true)} 
                        />
                      )}
                      {selectedItem.category === 'item' && <ItemForm key={selectedItem.id} item={selectedItem} onSave={handleUpdateItem} />}
                      
                      {selectedItem.category === 'event' && (
                        <EventForm 
                          key={selectedItem.id} 
                          item={selectedItem} 
                          calendarConfig={calendarConfig} 
                          onSave={handleUpdateItem} 
                          onDirty={() => setHasChanges(true)}
                        />
                      )}
                      
                      {(selectedItem.category === 'custom' || !['character', 'faction', 'item', 'event'].includes(selectedItem.category)) && <DynamicForm key={selectedItem.id} item={selectedItem} onSave={handleUpdateItem} />}
                    </>
                  )}
                </div>
             ) : (
                <div className="w-full flex items-center justify-center rounded-lg border-2 border-dashed border-slate-200">
                  <span className="text-slate-400">請從左側目錄選擇一個項目，或點擊右上角檢視全局視圖</span>
                </div>
             )}
          </div>
        </div>
      </main>
    </div>
  );
}