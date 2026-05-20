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
}

export function SettingsPanel({ projectId }: SettingsPanelProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [settingsData, setSettingsData] = useState<{ category: string; items: SettingItem[] }[]>([]);
  const [selectedItem, setSelectedItem] = useState<SettingItem | null>(null);
  const [viewMode, setViewMode] = useState<'form' | 'graph' | 'timeline'>('form');
  const [highlightedIds, setHighlightedIds] = useState<string[] | null>(null);

  // 🌟 追蹤當前表單是否有被修改且未儲存
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`/api/settings?projectId=${projectId}`); 
        if (!res.ok) throw new Error('讀取資料失敗');
        const data = await res.json();
        
        if (data && data.length > 0) {
          setSettingsData(data);
          if (window.location.hash !== '#editor') {
            window.location.replace('#editor');
          }
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('無法連線到資料庫:', error);
      }
    };

    if (projectId) {
      fetchSettings();
    }
  }, [projectId]); 

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
      
      // 🌟 核心修正：如果使用者按下「確定」決定放棄變更離開
      if (isUserSure) {
        setHasChanges(false); // 帳勾銷！把狀態洗白回「乾淨」，避免下一頁無限循環跳彈窗
        return true;          // 允許這次跳轉
      }
      
      return false; // 使用者按取消，留在原地
    }
    return true; // 本來就沒有變更，直接放行
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
    setHasChanges(false); // 🌟 儲存成功後，恢復安全狀態

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

      setSettingsData(prevData => {
        return prevData.map(group => {
          if (group.category === categoryName) {
            return { ...group, items: [...group.items, realItem] };
          }
          return group;
        });
      });
      
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
                /* 🌟 核心修正：將 onChange 與 onInput 監聽事件直接綁在表單包覆容器上，精準攔截內部所有欄位的變更事件冒泡 */
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