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

// 🌟 定義臨時資料庫的 Key
const STORAGE_KEY = 'writer_haven_settings_db';

export default function SettingsPage() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [settingsData, setSettingsData] = useState<{ category: string; items: SettingItem[] }[]>([]);
  const [selectedItem, setSelectedItem] = useState<SettingItem | null>(null);
  const [viewMode, setViewMode] = useState<'form' | 'graph' | 'timeline'>('form');
  const [highlightedIds, setHighlightedIds] = useState<string[] | null>(null);

  // 🌟 新增：網頁載入時，先去 localStorage 撈取舊資料
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      setSettingsData(JSON.parse(savedData));
      
      // 如果有存檔，我們自動把網址掛上 #editor 並設為已初始化
      if (window.location.hash !== '#editor') {
        window.location.replace('#editor');
      }
      setIsInitialized(true);
    }
  }, []);

  // 監聽網址的 Hash 變化，完美支援瀏覽器的「上一頁」
  useEffect(() => {
    const handleHashChange = () => {
      // 只有在還沒初始化，或是網址沒有 #editor 時才切換狀態
      // 如果 localStorage 已經有資料，我們盡量保持在編輯器畫面
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

  // 🌟 實作「更新與儲存項目」的函式 (給表單按鈕呼叫)
  const handleUpdateItem = (updatedItem: SettingItem) => {
    setSettingsData(prevData => {
      const newData = prevData.map(group => {
        // 找到這個項目所屬的目錄，並替換成更新後的項目
        if (group.category === updatedItem.category || group.items.some(i => i.id === updatedItem.id)) {
          return {
            ...group,
            items: group.items.map(item => item.id === updatedItem.id ? updatedItem : item)
          };
        }
        return group;
      });
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData)); // 寫入臨時資料庫
      return newData;
    });
    
    setSelectedItem(updatedItem); 
    alert('儲存成功！(目前暫存於瀏覽器)');
  };

  // 處理模板選擇的函式
  const handleSelectTemplate = (template: TemplateDef) => {
    setSettingsData(template.initialData); 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(template.initialData)); // 🌟 存檔
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

  // 新增項目函式
  const handleAddItem = (categoryName: string, type: string) => {
    const newItem: SettingItem = {
      id: `new-${Date.now()}`,
      name: "未命名新項目",
      category: type,
    };

    setSettingsData(prevData => {
      const newData = prevData.map(group => {
        if (group.category === categoryName) {
          return { ...group, items: [...group.items, newItem] };
        }
        return group;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData)); // 🌟 存檔
      return newData;
    });
    
    setSelectedItem(newItem);
    setViewMode('form');
  };

  // 刪除項目函式
  const handleDeleteItem = (itemId: string) => {
    setSettingsData(prevData => {
      const newData = prevData.map(group => ({
        ...group,
        items: group.items.filter(item => item.id !== itemId)
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData)); // 🌟 存檔
      return newData;
    });
    
    if (selectedItem?.id === itemId) {
      setSelectedItem(null);
    }
  };

  // 新增目錄的函式
  const handleAddCategory = (newCategoryName: string) => {
    if (!newCategoryName.trim()) return;
    
    if (settingsData.some(g => g.category === newCategoryName)) {
      alert("此目錄名稱已存在！");
      return;
    }

    setSettingsData(prev => {
      const newData = [...prev, { category: newCategoryName, items: [] }];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData)); // 🌟 存檔
      return newData;
    });
  };

  // 刪除目錄的函式
  const handleDeleteCategory = (categoryName: string) => {
    if (confirm(`確定要刪除「${categoryName}」目錄嗎？裡面的所有設定將會一併消失！`)) {
      setSettingsData(prev => {
        const newData = prev.filter(g => g.category !== categoryName);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newData)); // 🌟 存檔
        return newData;
      });
      
      if (selectedItem?.category === categoryName || selectedItem?.category === 'custom') {
        setSelectedItem(null);
        setViewMode('form');
      }
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
                  {/* TRPG 特規表單 (尚未綁定儲存函式) */}
                  {selectedItem.category === 'character' && <CharacterForm key={selectedItem.id} item={selectedItem} />}
                  {selectedItem.category === 'faction' && <FactionForm key={selectedItem.id} item={selectedItem} />}
                  {selectedItem.category === 'item' && <ItemForm key={selectedItem.id} item={selectedItem} />}
                  {selectedItem.category === 'event' && <EventForm key={selectedItem.id} item={selectedItem} />}
                  
                  {/* 🌟 通用表單：已經綁定剛寫好的 onSave 儲存函式 */}
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