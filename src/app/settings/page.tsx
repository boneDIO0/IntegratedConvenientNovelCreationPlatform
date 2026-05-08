// src/app/settings/page.tsx
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

const STORAGE_KEY = 'writer_haven_settings_db';

export default function SettingsPage() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [settingsData, setSettingsData] = useState<{ category: string; items: SettingItem[] }[]>([]);
  const [selectedItem, setSelectedItem] = useState<SettingItem | null>(null);
  const [viewMode, setViewMode] = useState<'form' | 'graph' | 'timeline'>('form');
  const [highlightedIds, setHighlightedIds] = useState<string[] | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings'); 
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

    fetchSettings();
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hasSavedData = !!localStorage.getItem(STORAGE_KEY);
      
      if (window.location.hash === '#editor') {
        setIsInitialized(true);
      } else if (!hasSavedData) {
        setIsInitialized(false);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 🌟 實作「更新與儲存項目」的函式
  const handleUpdateItem = async (updatedItem: SettingItem) => {
    setSettingsData(prevData => {
      const newData = prevData.map(group => {
        if (group.category === updatedItem.category || group.items.some(i => i.id === updatedItem.id)) {
          return {
            ...group,
            items: group.items.map(item => item.id === updatedItem.id ? updatedItem : item)
          };
        }
        return group;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData)); 
      return newData;
    });
    
    setSelectedItem(updatedItem); 

    try {
      const res = await fetch(`/api/settings/${updatedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem)
      });

      if (!res.ok) {
        throw new Error('伺服器回應錯誤');
      }

      alert('🎉 儲存成功！已安全寫入雲端資料庫。');
      
    } catch (error) {
      console.error('儲存至資料庫失敗:', error);
      alert('⚠️ 儲存至雲端失敗，但已暫存於您的瀏覽器中。');
    }
  };

  const handleSelectTemplate = (template: TemplateDef) => {
    setSettingsData(template.initialData); 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(template.initialData)); 
    window.location.hash = 'editor';
  };

  const handleEventHighlight = (ids: string[]) => {
    setHighlightedIds(ids);
    setViewMode('graph'); 
  };

  const handleNodeSelectFromGraph = (nodeId: string) => {
    for (const group of settingsData) {
      const found = group.items.find(item => item.id === nodeId);
      if (found) {
        setSelectedItem(found);
        setViewMode('timeline');
        break;
      }
    }
  };

  const handleAddItem = async (categoryName: string, type: string) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryName: categoryName,
          type: type, 
          item: { name: "未命名新項目" } 
        })
      });

      if (!res.ok) throw new Error('新增至資料庫失敗');
      
      const realItem = await res.json(); 

      setSettingsData(prevData => {
        const newData = prevData.map(group => {
          if (group.category === categoryName) {
            return { ...group, items: [...group.items, realItem] };
          }
          return group;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newData)); 
        return newData;
      });
      
      setSelectedItem(realItem);
      setViewMode('form');
    } catch (error) {
      console.error(error);
      alert('新增失敗！請確認資料庫狀態。');
    }
  };

  const handleDeleteItem = (itemId: string) => {
    setSettingsData(prevData => {
      const newData = prevData.map(group => ({
        ...group,
        items: group.items.filter(item => item.id !== itemId)
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData)); 
      return newData;
    });
    
    if (selectedItem?.id === itemId) {
      setSelectedItem(null);
    }
  };

  const handleAddCategory = async (newCategoryName: string) => {
    setSettingsData(prev => [...prev, { category: newCategoryName, items: [] }]);
    
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'new_category', name: newCategoryName })
    });
  };

  const handleDeleteCategory = async (categoryName: string) => {
    if (confirm(`確定要刪除「${categoryName}」目錄嗎？裡面的所有設定將會一併消失！`)) {
      setSettingsData(prev => {
        const newData = prev.filter(g => g.category !== categoryName);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newData)); 
        return newData;
      });
      
      if (selectedItem?.category === categoryName || selectedItem?.category === 'custom') {
        setSelectedItem(null);
        setViewMode('form');
      }
    }
  };

  const handleRenameCategory = async (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return;

    setSettingsData(prev => {
      const newData = prev.map(group => {
        if (group.category === oldName) {
          return {
            ...group,
            category: newName,
            items: group.items.map(item => ({ ...item, category: newName }))
          };
        }
        return group;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      return newData;
    });

    if (selectedItem?.category === oldName) {
      setSelectedItem({ ...selectedItem, category: newName });
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
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                  {template.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{template.name}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {template.description}
                </p>
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
            setSelectedItem(item);
            setViewMode('form'); 
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
            <h1 className="text-2xl font-bold text-slate-800">
              {viewMode === 'graph' ? '全域人物關係圖' : selectedItem ? `${selectedItem.name} (編輯中)` : "未選取項目"}
            </h1>
            
            <div className="flex gap-2">
              <button 
                onClick={() => { setViewMode('timeline'); setHighlightedIds(null); }}
                className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'timeline' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                ⏳ 歷史時間軸
              </button>

              <button 
                onClick={() => { setViewMode('graph'); setHighlightedIds(null); }}
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
                  highlightedIds={highlightedIds} 
                  onNodeSelect={handleNodeSelectFromGraph} 
                />
             ) : selectedItem ? (
                <div className="w-full rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
                  {selectedItem.category === 'character' && <CharacterForm key={selectedItem.id} item={selectedItem} onSave={handleUpdateItem} />}
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