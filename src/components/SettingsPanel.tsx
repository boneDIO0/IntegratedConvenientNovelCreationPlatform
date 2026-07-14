'use client'

import { useState, useEffect } from "react";
import SettingsSidebar from "@/components/SettingsSidebar";
import CharacterForm from "@/components/CharacterForm";
import RelationGraph from "@/components/RelationGraph"; 
import { SettingItem } from "@/types"; // 🎯 對齊全域完全體型別引入
import FactionForm from "@/components/FactionForm";
import ItemForm from "@/components/ItemForm";
import EventForm from "@/components/EventForm";
import TimelineView from "@/components/TimelineView";
import DynamicForm from "@/components/DynamicForm";
import { CalendarConfig } from "@/lib/calendarEngine"; 
import CalendarConfigForm from "@/components/CalendarConfigForm"; 
import { useEditorUI } from "@/contexts/EditorUIContext";
import { useRouter } from "next/navigation";
import LocationForm from './LocationForm'; 

interface SettingsPanelProps {
  projectId: string;
  chapterId?: string;
}

export function SettingsPanel({ projectId, chapterId }: SettingsPanelProps) {
  const { isEditable } = useEditorUI();
  const router = useRouter();
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

  const [isLocalHistoryOpen, setIsLocalHistoryOpen] = useState(false);

  const handleRestoreVersion = async (timestamp: number) => {
    if (!selectedItem) return;
    try {
      console.log(`⏳ [時光機前端] 開始發送還原，目標時間戳記: ${timestamp}`);

      const res = await fetch(`/api/settings/${selectedItem.id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "後端還原失敗");
      }

      const dbEntity = await res.json();

      const dbContent = dbEntity.content && typeof dbEntity.content === 'object' ? dbEntity.content : {};

      const alignedItem = {
        ...dbEntity,
        ...dbContent, 
        name: dbEntity.title || dbEntity.name,
        category: dbContent.category || dbEntity.category || 'custom', // 還原型別定錨
        content: dbEntity.content
      };

      alert("🎉 項目已成功還原至該歷史存檔點！");

      await fetchSettings();
      setSelectedItem(alignedItem); 

    } catch (error: any) {
      console.error("🔴 還原執行中斷:", error);
      alert(`⚠️ 還原失敗: ${error.message || "未知錯誤"}`);
    }
  };

  const handleDeleteVersion = async (timestamp: number) => {
    if (!selectedItem) return;
    try {
      const res = await fetch(`/api/settings/${selectedItem.id}/versions/${timestamp}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error("刪除失敗");
      alert("🎉 歷史備份已成功刪除！");

      await fetchSettings();
      const updatedRes = await fetch(`/api/settings/${selectedItem.id}`);
      if (updatedRes.ok) {
        const latest = await updatedRes.json();
        const latestContent = latest.content && typeof latest.content === 'object' ? latest.content : {};
        setSelectedItem({
          ...latest,
          ...latestContent,
          category: latestContent.category || latest.category || 'custom'
        });
      }
    } catch (error) {
      console.error("刪除版本出錯:", error);
      alert("⚠️ 刪除歷史版本失敗。");
    }
  };

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      
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
        
        if (!globalData || globalData.length === 0) {
          const initRes = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              action: 'init_novel_template', 
              projectId: projectId 
            })
          });

          if (initRes.ok) {
            const refreshedRes = await fetch(`/api/settings?projectId=${projectId}`);
            const refreshedData = await refreshedRes.json();
            setGlobalAllSettings(refreshedData);
            setSettingsData(refreshedData);
          }
        } else {
          setGlobalAllSettings(globalData);
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
    }
  };

  const handleUpdateItem = async (updatedItem: SettingItem) => {
    // 1. 強指定錨當前分類，阻斷非同步回彈
    setSelectedItem(updatedItem);
    setHasChanges(false);

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

    try {
      const res = await fetch(`/api/settings/${updatedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updatedItem, saveVersion: true })
      });

      if (!res.ok) throw new Error("後端儲存失敗");

      const latestEntityFromDB = await res.json();
      const dbContent = latestEntityFromDB.content && typeof latestEntityFromDB.content === 'object' ? latestEntityFromDB.content : {};

      const alignedUpdatedItem = {
        ...latestEntityFromDB,
        ...dbContent, 
        category: updatedItem.category, // 🌟 核心防禦：強制鎖定前端轉生分類，不使用後端目錄覆蓋值
        name: latestEntityFromDB.title || latestEntityFromDB.name || updatedItem.name,
        content: latestEntityFromDB.content 
      };

      // 🎯 採取時序分流：先徹底更新好當前選取的 Form 狀態，再回頭 fetch 背景大陣列
      setSelectedItem(alignedUpdatedItem);
      
      setTimeout(async () => {
        await fetchSettings();
        setSelectedItem(alignedUpdatedItem); // 二次鎖定
      }, 100);

    } catch (error) {
      console.error("雲端同步出錯:", error);
      alert("⚠️ 雲端同步失敗，請檢查後端連線狀態。");
    }
  };

  const handleEventHighlight = (ids: string[]) => {
    if (!confirmLeave()) return; 
    setHighlightedIds(ids);
    setViewMode('graph'); 
  };

  const handleNodeSelectFromGraph = (nodeId: string) => {
    if (nodeId === "project-calendar-config") return;
    for (const group of settingsData) {
      const found = group.items.find(item => item.id === nodeId);
      if (found) {
        const alignedItem: SettingItem = {
          ...found,
          name: found.name || "未命名項目",
          category: found.category || "custom",
          description: found.description || ""
        };

        setSelectedItem(alignedItem); 
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
    } catch (error) {
      console.error("刪除雲端同步失敗:", error);
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

  // 輔助函式：用來將分類對齊中文字串做雙向匹配
  const checkCategoryMatch = (groupName: string, type: string) => {
    const gName = groupName.toLowerCase();
    const tName = type.toLowerCase();
    if (gName.includes(tName)) return true;
    if (tName === 'character' && gName.includes('人物')) return true;
    if (tName === 'faction' && gName.includes('組織')) return true;
    if (tName === 'item' && gName.includes('物品')) return true;
    if (tName === 'event' && gName.includes('事件')) return true;
    if (tName === 'location' && gName.includes('地點')) return true;
    return false;
  };

return (
    <div className="flex h-screen w-full bg-slate-50 md:flex-row flex-col overflow-hidden">
      {/* 🎯 左側：獨立固定目錄側邊欄 - 加裝 flex-shrink-0，不論右方內容多長，絕對不准縮水變窄！ */}
      <aside className="w-full md:w-80 flex-shrink-0 border-r border-slate-200 bg-white p-4 overflow-y-auto hidden md:block">
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

      {/* 🎯 右側主舞台：包含上方導覽與下方雙欄區 - 使用 min-w-0 隔絕任何內部溢出撐開 */}
      <main className="flex-1 min-w-0 overflow-y-auto p-4 md:p-8 flex flex-col h-full">
        <div className="mx-auto w-full max-w-5xl flex-1 flex flex-col h-full min-w-0">
          
          {/* 上方導覽控制列 */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 flex-shrink-0 w-full min-w-0">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-slate-800 truncate">
                {viewMode === 'graph' ? '全域人物關係圖' : 
                 viewMode === 'chapter_manager' ? '🎬 本章登場要素配置' :
                 selectedItem ? `${selectedItem.name} ${hasChanges ? '*(已修改)' : '(編輯中)'}` : "未選取項目"}
              </h1>

              {selectedItem && selectedItem.id !== "project-calendar-config" && (viewMode === 'form' || !viewMode) && (
                <>
                  <select
                    value={selectedItem.category}
                    disabled={!isEditable}
                    onChange={async (e) => {
                      if (!selectedItem) return;
                      const newType = e.target.value;
                      const updated = { ...selectedItem, category: newType };
        
                      setSelectedItem(updated);

                      setSettingsData(prevData => {
                        return prevData.map(group => {
                          const filteredItems = group.items.filter(i => i.id !== selectedItem.id);
                          if (checkCategoryMatch(group.category, newType)) {
                            return {
                              ...group,
                              items: [...group.items.filter(i => i.id !== selectedItem.id), updated]
                            };
                          }
                          return { ...group, items: filteredItems };
                        });
                      });

                      try {
                        await fetch(`/api/settings/${selectedItem.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(updated),
                        });

                        setTimeout(async () => {
                          await fetchSettings(); 
                          setSelectedItem(updated);
                        }, 150);

                      } catch (error) {
                        console.error("轉生表單失敗:", error);
                      }
        
                      setHasChanges(true);
                    }}
                    className="text-sm font-medium border border-slate-200 rounded-md px-3 py-1.5 bg-white text-slate-600 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer shadow-sm disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:hover:border-slate-200"
                  >
                    <option value="character">👤 人物表單</option>
                    <option value="faction">🏛️ 組織表單</option>
                    <option value="item">⚔️ 物品表單</option>
                    <option value="event">📜 事件表單</option>
                    <option value="location">📍 地點表單</option>
                    <option value="custom">⚙️ 通用表單</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setIsLocalHistoryOpen(!isLocalHistoryOpen)}
                    className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all flex items-center gap-1.5 shadow-sm border ${
                      isLocalHistoryOpen
                        ? "bg-purple-600 border-purple-600 text-white hover:bg-purple-700"
                        : "bg-purple-50 border-purple-100 text-purple-700 hover:bg-purple-100"
                    }`}
                  >
                    ⏳ 項目歷史
                  </button>
                </>
              )}
            </div>
            
            <div className="flex flex-wrap gap-1.5 flex-shrink-0 items-center">
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
          
          {/* 🎯 下方核心展示大容器：加入 gap 與 w-full min-w-0，開啟雙欄硬抗擠壓防禦 */}
          <div className={`flex-1 w-full min-w-0 items-start ${
            viewMode === 'chapter_manager' ? 'block' : 'flex gap-6'
          }`}>
            
            {/* 🎯 左大區：中央編輯表單主舞台 - 灌入 flex-1 min-w-0，允許內文有 LaTeX 公式時在內部安全寬度內渲染，決不向外撐爆父層！ */}
            <div className="flex-1 min-w-0 h-full">
               {viewMode === 'timeline' ? (
                  <TimelineView 
                    allSettings={globalAllSettings}       
                    calendarConfig={calendarConfig}       
                    filterTargetId={selectedItem?.id}     
                    onEventClick={handleEventHighlight}   
                  />
               ) : viewMode === 'graph' ? (
                  <RelationGraph allSettings={globalAllSettings} highlightedIds={highlightedIds} onNodeSelect={handleNodeSelectFromGraph} />
               ) : viewMode === 'chapter_manager' ? (
                  <div className="w-full rounded-lg border border-slate-200 bg-white p-8 shadow-sm flex flex-col space-y-6 overflow-y-auto max-h-[calc(100vh-200px)]">
                    <div className="flex items-start justify-between border-b border-slate-100 pb-4 flex-shrink-0">
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

                    <div className="space-y-6 flex-1 overflow-y-auto pr-1">
                      {globalAllSettings.map((group) => (
                        <div key={group.category} className="space-y-3 min-w-0"> {/* 🌟 補上 min-w-0 */}
                          <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">
                            {group.category}
                          </h4>
                          {/* 🌟 加上 min-w-0，防止 Grid 被內部的長文字硬撐開 */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                            {group.items.map((item) => {
                              const isAssigned = settingsData
                                .flatMap((g) => g.items)
                                .some((i) => i.id === item.id);

                              return (
                                <label 
                                  key={item.id} 
                                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none min-w-0 ${
                                    isAssigned 
                                      ? 'border-blue-500 bg-blue-50/40 shadow-sm' 
                                      : 'border-slate-200 bg-white hover:border-slate-300'
                                  }`}
                                >
                                  {/* 🌟 min-w-0 是關鍵！ */}
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                      item.category === 'character' ? 'bg-blue-500' : 
                                      item.category === 'faction' ? 'bg-orange-500' : 
                                      item.category === 'location' ? 'bg-blue-600' : 
                                      'bg-emerald-500'
                                    }`} />
                                    {/* 🌟 加上 truncate，長文字（如言峰綺禮聖堂教會）太長時會自動變成 ...，絕對不撐寬網格！ */}
                                    <span className="text-sm font-semibold text-slate-800 truncate block">
                                      {item.name}
                                    </span>
                                  </div>
                                  <input 
                                    type="checkbox"
                                    checked={isAssigned}
                                    disabled={!isEditable}
                                    onChange={(e) => handleToggleSettingToChapter(item.id, e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0 ml-2"
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
                  <fieldset 
                    disabled={!isEditable}
                    className="w-full min-w-0 rounded-lg border border-slate-200 bg-white p-8 shadow-sm overflow-x-auto"
                  >
                    {!isEditable && (
                      <div className="mb-6 flex items-center gap-2 rounded-md bg-slate-50 border border-slate-200 p-3 text-sm text-slate-600">
                        🔒 <span className="font-medium">唯讀模式</span>：你目前正在檢視此設定集，沒有編輯權限。
                      </div>
                    )}

                    {selectedItem.id === "project-calendar-config" ? (
                      <CalendarConfigForm
                        projectId={projectId}
                        initialConfig={calendarConfig as any}
                        isEditable={isEditable}
                        onSaveSuccess={(latestConfigFromBackend) => {
                          if (latestConfigFromBackend) {
                            setCalendarConfig(latestConfigFromBackend as any);
                          } else {
                            fetchSettings();
                          }
                          setHasChanges(false);
                        }}
                        onDirty={() => setHasChanges(true)}
                      />
                    ) : (
                      <>
                        {selectedItem.category === 'character' && (
                          <CharacterForm
                            key={`${selectedItem.id}-${selectedItem.category}-${(selectedItem as any).content?.versions?.length || 0}`}
                            item={selectedItem}
                            onSave={handleUpdateItem}
                            allSettings={globalAllSettings}
                            currentChapterSettings={settingsData}
                            onDirty={() => setHasChanges(true)}
                          />
                        )}

                        {selectedItem.category === 'faction' && (
                          <FactionForm
                            key={`${selectedItem.id}-${selectedItem.category}-${(selectedItem as any).content?.versions?.length || 0}`}
                            item={selectedItem}
                            allSettings={globalAllSettings} 
                            onSave={handleUpdateItem}
                            onDirty={() => setHasChanges(true)}
                          />
                        )}

                        {selectedItem.category === 'item' && (
                          <ItemForm
                            key={`${selectedItem.id}-${selectedItem.category}-${(selectedItem as any).content?.versions?.length || 0}`}
                            item={selectedItem}
                            allSettings={globalAllSettings} 
                            onSave={handleUpdateItem}
                            onDirty={() => setHasChanges(true)}
                          />
                        )}

                        {selectedItem.category === 'event' && (
                          <EventForm
                            key={`${selectedItem.id}-${selectedItem.category}-${(selectedItem as any).content?.versions?.length || 0}`}
                            item={selectedItem}
                            calendarConfig={calendarConfig}
                            allSettings={globalAllSettings}
                            onSave={handleUpdateItem}
                            onDirty={() => setHasChanges(true)}
                          />
                        )}

                        {selectedItem.category === 'location' && (
                          <LocationForm
                            key={`${selectedItem.id}-${selectedItem.category}-${(selectedItem as any).content?.versions?.length || 0}`}
                            item={selectedItem}
                            allSettings={globalAllSettings}
                            onSave={handleUpdateItem}
                            onDirty={() => setHasChanges(true)}
                          />
                        )}

                        {(selectedItem.category === 'custom' || !['character', 'faction', 'item', 'event', 'location'].includes(selectedItem.category)) && (
                          <DynamicForm 
                            key={`${selectedItem.id}-${selectedItem.category}-${(selectedItem as any).content?.versions?.length || 0}`} 
                            item={selectedItem} 
                            onSave={handleUpdateItem} 
                          />
                        )}
                      </>
                    )}
                  </fieldset>
               ) : (
                  <div className="w-full flex items-center justify-center rounded-lg border-2 border-dashed border-slate-200 min-h-[400px]">
                    <span className="text-slate-400">請從左側目錄選擇一個項目，或點擊右上角檢視全局視圖</span>
                  </div>
               )}
            </div>

            {/* 🎯 右小區：獨立時光機歷史面板 - 焊死 w-80 flex-shrink-0 雙保險，無論左邊公式推擠力道多強，在此處絕對不動如山！ */}
            {isLocalHistoryOpen && selectedItem && (
              <aside className="w-80 flex-shrink-0 border-l border-slate-200 bg-white p-4 overflow-y-auto flex flex-col h-full max-h-[calc(100vh-160px)] animate-in slide-in-from-right duration-200 shadow-sm rounded-xl">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2 flex-shrink-0">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    ⏳ 項目版本時光機
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsLocalHistoryOpen(false)}
                    className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                  {(() => {
                    const itemAny = selectedItem as any;
                    const versions =
                      Array.isArray(itemAny.content?.versions) ? itemAny.content.versions :
                      Array.isArray(itemAny.versions) ? itemAny.versions :
                      [];

                    if (versions.length > 0) {
                      return versions
                        .slice()
                        .reverse()
                        .map((version: any, index: number) => {
                          const ts = version.timestamp || version.id || version.time;
                          const dateObject = new Date(Number(ts));
                          const isValidDate = !isNaN(dateObject.getTime());

                          const displayTime = isValidDate
                            ? dateObject.toLocaleString('zh-TW', { hour12: true })
                            : "未知儲存時間";

                          return (
                            <div
                              key={ts || index}
                              className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-purple-400 hover:shadow-md transition-all group relative"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`確定要刪除此條歷史備份嗎？此動作無法復原。`)) {
                                    handleDeleteVersion(Number(ts));
                                  }
                                }}
                                className="absolute top-3 right-3 text-xs text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1"
                                title="刪除此版本"
                              >
                                🗑️
                              </button>

                              <p className="text-xs font-semibold text-purple-600 mb-1">
                                {displayTime}
                              </p>

                              <p className="text-sm font-bold text-slate-800 mb-3 truncate">
                                {version.name || selectedItem.name} - 歷史存檔點
                              </p>

                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`確定要將「${selectedItem.name}」還原到此歷史版本嗎？\n目前未儲存的變更將會遺失。`)) {
                                    handleRestoreVersion(Number(ts));
                                  }
                                }}
                                className="w-full py-1.5 bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-200 rounded-lg text-xs font-semibold text-slate-600 hover:text-purple-700 transition-colors"
                              >
                                🔄 還原至此版本
                              </button>
                            </div>
                          );
                        });
                    }

                    return (
                      <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl flex-shrink-0">
                        <span>此項目尚無任何歷史變動紀錄</span>
                        <p className="text-[10px] text-slate-400 mt-1">（每次儲存時後端將自動建立）</p>
                      </div>
                    );
                  })()}
                </div>
              </aside>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}