"use client";

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

interface SettingsPanelProps {
  projectId: string;
  chapterId?: string;
}

export function SettingsPanel({ projectId, chapterId }: SettingsPanelProps) {
  const [settingsData, setSettingsData] = useState<{ category: string; items: SettingItem[] }[]>([]);
  // 🌟 1. 核心新增：儲存這本小說完全沒有過濾的「全域完整設定集」，供管理器勾選使用
  const [globalAllSettings, setGlobalAllSettings] = useState<{ category: string; items: SettingItem[] }[]>([]);
  
  const [selectedItem, setSelectedItem] = useState<SettingItem | null>(null);
  const [viewMode, setViewMode] = useState<'form' | 'graph' | 'timeline'>('form');
  const [highlightedIds, setHighlightedIds] = useState<string[] | null>(null);

  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true); 
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncingChapter, setIsSyncingChapter] = useState(false); // 控制勾選時的 loading 狀態

  // 🌟 2. 核心抽離：將 Fetch 邏輯獨立出來，方便勾選完後能即時局部刷新
  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      let url = `/api/settings?projectId=${projectId}`;
      if (chapterId) {
        url += `&chapterId=${chapterId}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('讀取資料失敗');
      const data = await res.json();
      
      if (data && data.length > 0) {
        setSettingsData(data);
        setIsInitialized(true);
        if (window.location.hash !== '#editor') {
          window.location.replace('#editor');
        }
      } else {
        setIsInitialized(false);
      }

      // 🌟 3. 如果處於章節模式，加碼撈取一份不帶 chapterId 的完整設定庫，用來做全域要素對照
      if (chapterId) {
        const globalRes = await fetch(`/api/settings?projectId=${projectId}`);
        if (globalRes.ok) {
          const globalData = await globalRes.json();
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
    }
  }, [projectId, chapterId]); // 🌟 監聽 chapterId 切換，換章節時自動重綁資料

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#editor') {
        setIsInitialized(true);
      } else if (settingsData.length === 0) {
        setIsInitialized(false);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [settingsData.length]);

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

  // 🌟 4. 核心新增：處理將設定實體勾選加入/退出本章節的多對多 API 呼叫
  const handleToggleSettingToChapter = async (entityId: string, isChecked: boolean) => {
    if (!chapterId) return;
    try {
      setIsSyncingChapter(true);
      // 假設你新增了此功能對應的關聯 API 端點
      const res = await fetch(`/api/settings`, {
        method: 'PATCH', // 使用 PATCH 來處理局部關聯變更
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isChecked ? 'connect_chapter' : 'disconnect_chapter',
          chapterId: chapterId,
          entityId: entityId
        })
      });

      if (!res.ok) throw new Error('同步章節設定失敗');
      
      // 勾選聯動成功後，重新整理當前畫面資料，側邊欄目錄就會即時增減！
      await fetchSettings();
    } catch (error) {
      console.error(error);
      alert('⚠️ 關聯章節要素失敗，請確認資料庫狀態。');
    } finally {
      setIsSyncingChapter(false);
    }
  };

  // 更新與儲存項目
  const handleUpdateItem = async (updatedItem: SettingItem) => {
    setSettingsData(prevData => {
      return prevData.map(group => {
        if (group.category === updatedItem.category || group.items.some(i => i.id === updatedItem.id)) {
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

      if (!res.ok) throw new Error('伺服器回應錯誤');
      console.log('🎉 儲存成功！已安全寫入雲端資料庫。');
    } catch (error) {
      console.error('儲存至資料庫失敗:', error);
      alert('⚠️ 儲存至雲端失敗。');
    }
  };

  // 處理模板選擇
  const handleSelectTemplate = async (template: TemplateDef) => {
    setSettingsData(template.initialData); 
    window.location.hash = 'editor';
    setIsInitialized(true);

    const getCategoryType = (name: string) => {
      if (name.includes('人物')) return 'character';
      if (name.includes('組織')) return 'faction';
      if (name.includes('物品')) return 'item';
      if (name.includes('事件')) return 'event';
      return 'custom';
    };

    try {
      await Promise.all(
        template.initialData.map(group => 
          fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              type: 'new_category', 
              name: group.category,
              categoryType: getCategoryType(group.category),
              projectId: projectId 
            })
          })
        )
      );
    } catch (error) {
      console.error('同步模板目錄至資料庫失敗:', error);
    }
  };

  const handleEventHighlight = (ids: string[]) => {
    if (!confirmLeave()) return; 
    setHighlightedIds(ids);
    setViewMode('graph'); 
  };

  const handleNodeSelectFromGraph = (nodeId: string) => {
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

  // 新增項目
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

      // 🌟 如果是在章節模式下直接點「+」新增項目，除了塞進列表，通常也默認跟當前章節自動 connect
      if (chapterId) {
        await fetch(`/api/settings`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'connect_chapter', chapterId, entityId: realItem.id })
        });
      }

      await fetchSettings(); // 重新整理
      setSelectedItem(realItem);
      setViewMode('form');
      setHasChanges(false); 
    } catch (error) {
      console.error(error);
      alert('新增失敗！請確認資料庫狀態。');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    setSettingsData(prevData => {
      return prevData.map(group => ({
        ...group,
        items: group.items.filter(item => item.id !== itemId)
      }));
    });
    
    if (selectedItem?.id === itemId) {
      setSelectedItem(null);
      setHasChanges(false);
    }

    try {
      await fetch(`/api/settings/${itemId}`, { method: 'DELETE' });
    } catch (error) {
      console.error("刪除項目失敗", error);
    }
  };

  // 新增目錄
  const handleAddCategory = async (newCategoryName: string) => {
    if (!newCategoryName.trim()) return;
    if (settingsData.some(g => g.category === newCategoryName)) {
      alert("此目錄名稱已存在！");
      return;
    }

    setSettingsData(prev => [...prev, { category: newCategoryName, items: [] }]);
    
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'new_category', 
          name: newCategoryName,
          projectId: projectId 
        })
      });
    } catch (error) {
      console.error("新增目錄失敗", error);
    }
  };

  const handleDeleteCategory = async (categoryName: string) => {
    if (confirm(`確定要刪除「${categoryName}」目錄嗎？裡面的所有設定將會一併消失！`)) {
      setSettingsData(prev => prev.filter(g => g.category !== categoryName));
      if (selectedItem?.category === categoryName || selectedItem?.category === 'custom') {
        setSelectedItem(null);
        setViewMode('form');
        setHasChanges(false);
      }
      try {
        await fetch('/api/settings', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete_category', categoryName: categoryName, projectId: projectId })
        });
      } catch (error) {
        console.error('刪除目錄失敗:', error);
      }
    }
  };

  const handleRenameCategory = async (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return;
    setSettingsData(prev => {
      return prev.map(group => group.category === oldName ? { ...group, category: newName } : group);
    });
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename_category', oldName, newName, projectId })
      });
    } catch (error) {
      console.error(error);
    }
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
            <p className="text-slate-500">請選擇一個預設模板，或從完全空白的畫布開始。</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLATFORM_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className="flex flex-col items-start p-6 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 hover:shadow-md transition-all text-left group"
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{template.icon}</div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{template.name}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{template.description}</p>
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
                {viewMode === 'graph' ? '全域人物關係圖' : selectedItem ? `${selectedItem.name} ${hasChanges ? '*(已修改)' : '(編輯中)'}` : "未選取項目"}
              </h1>
              
              {selectedItem && viewMode === 'form' && (
                <select
                  value={selectedItem.category}
                  onChange={(e) => {
                    const newType = e.target.value;
                    const updated = { ...selectedItem, category: newType };
                    setSelectedItem(updated);
                    handleUpdateItem(updated); 
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
                className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'timeline' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                ⏳ 歷史時間軸
              </button>

              <button 
                onClick={() => { if (!confirmLeave()) return; setViewMode('graph'); setHighlightedIds(null); }}
                className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'graph' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                🗺️ 檢視關係圖
              </button>

              <button 
                onClick={() => setViewMode('form')}
                className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'form' ? 'bg-slate-100 text-slate-900 border-slate-300' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                📝 返回編輯器
              </button>
            </div>
          </div>
          
          <div className="flex-1 min-h-[600px] flex">
             {viewMode === 'timeline' ? (
                <TimelineView 
                  onEventClick={handleEventHighlight} 
                  filterTargetId={selectedItem?.id} 
                />
             ) : viewMode === 'graph' ? (
                <RelationGraph 
                  allSettings={settingsData} 
                  highlightedIds={highlightedIds}
                  onNodeSelect={handleNodeSelectFromGraph} 
                />
             ) : selectedItem ? (
                <div 
                  className="w-full rounded-lg border border-slate-200 bg-white p-8 shadow-sm"
                  onChange={() => setHasChanges(true)}
                  onInput={() => setHasChanges(true)}
                >
                  {selectedItem.category === 'character' && (
                    <CharacterForm 
                      key={selectedItem.id} 
                      item={selectedItem} 
                      onSave={handleUpdateItem} 
                      allSettings={settingsData} 
                    />
                  )}
                  {selectedItem.category === 'faction' && <FactionForm key={selectedItem.id} item={selectedItem} onSave={handleUpdateItem} />}
                  {selectedItem.category === 'item' && <ItemForm key={selectedItem.id} item={selectedItem} onSave={handleUpdateItem} />}
                  {selectedItem.category === 'event' && <EventForm key={selectedItem.id} item={selectedItem} onSave={handleUpdateItem} />}

                  {(selectedItem.category === 'custom' || !['character', 'faction', 'item', 'event'].includes(selectedItem.category)) && (
                    <DynamicForm 
                      key={selectedItem.id} 
                      item={selectedItem} 
                      onSave={handleUpdateItem} 
                    />
                  )}
                </div>
             ) : (
                /* 🌟 5. 核心大升級：如果沒有選取單一項目，且正處於章節模式中，直接渲染「本章登場要素管理大面板」 */
                chapterId ? (
                  <div className="w-full rounded-lg border border-slate-200 bg-white p-8 shadow-sm flex flex-col space-y-6 overflow-y-auto max-h-[700px]">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-1">🎬 本章登場設定管理</h3>
                      <p className="text-sm text-slate-500">
                        勾選下方項目以將角色、組織或道具拉入本章快捷側邊欄。未勾選的項目將在寫作時隱藏，助你專注當前分鏡。
                      </p>
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
                              // 反查該項目是否已經存在於當前章節的過濾列表中
                              const isAssigned = settingsData
                                .flatMap((g) => g.items)
                                .some((i) => i.id === item.id);

                              return (
                                <label 
                                  key={item.id} 
                                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                    isAssigned 
                                      ? 'border-blue-500 bg-blue-50/40 shadow-sm' 
                                      : 'border-slate-200 bg-white hover:border-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${
                                      item.category === 'character' ? 'bg-blue-500' : 
                                      item.category === 'faction' ? 'bg-orange-500' : 'bg-emerald-500'
                                    }`} />
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
                ) : (
                  /* 如果是非章節模式（全域模式），且沒有點選卡片，則維持原本的空白提示 */
                  <div className="w-full flex items-center justify-center rounded-lg border-2 border-dashed border-slate-200">
                    <span className="text-slate-400">請從左側目錄選擇一個項目，或點擊右上角檢視全局視圖</span>
                  </div>
                )
             )}
          </div>
        </div>
      </main>
    </div>
  );
}