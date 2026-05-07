// src/app/settings/page.tsx
"use client";

// 🌟 1. 記得從 react 引入 useEffect
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

export default function SettingsPage() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [settingsData, setSettingsData] = useState<{ category: string; items: SettingItem[] }[]>([]);
  const [selectedItem, setSelectedItem] = useState<SettingItem | null>(null);
  const [viewMode, setViewMode] = useState<'form' | 'graph' | 'timeline'>('form');
  const [highlightedIds, setHighlightedIds] = useState<string[] | null>(null);

  // 🌟 2. 新增：監聽網址的 Hash 變化，來完美支援瀏覽器的「上一頁」
  useEffect(() => {
    const handleHashChange = () => {
      // 如果網址後面有 #editor，就顯示編輯器；否則退回模板選擇畫面
      setIsInitialized(window.location.hash === '#editor');
    };

    // 註冊監聽器：當使用者按瀏覽器的上一頁/下一頁時觸發
    window.addEventListener('hashchange', handleHashChange);
    
    // 元件剛載入時也檢查一次網址
    handleHashChange();

    // 清除監聽器
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 🌟 3. 修改：處理模板選擇的函式
  const handleSelectTemplate = (template: TemplateDef) => {
    setSettingsData(template.initialData); 
    
    // 拔掉原本的 setIsInitialized(true); 
    // 改為在網址加上 #editor，這會自動觸發上面的 handleHashChange，並增加一筆歷史紀錄
    window.location.hash = 'editor';
  };

  const handleEventHighlight = (ids: string[]) => {
    setHighlightedIds(ids);
    setViewMode('graph'); // 自動把畫面切換到關係圖！
  };

  const handleNodeSelectFromGraph = (nodeId: string) => {
    // 🌟 記得改成從狀態 settingsData 裡面撈資料，而不是原本寫死的 mockSettings
    for (const group of settingsData) {
      const found = group.items.find(item => item.id === nodeId);
      if (found) {
        setSelectedItem(found);
        setViewMode('timeline'); // 瞬間切換到時間軸！
        break;
      }
    }
  };

  // 🌟 2. 實作「新增項目」函式
  const handleAddItem = (categoryName: string, type: string) => {
    const newItem: SettingItem = {
      id: `new-${Date.now()}`,
      name: "未命名新項目",
      category: type,
    };

    setSettingsData(prevData => 
      prevData.map(group => {
        if (group.category === categoryName) {
          return { ...group, items: [...group.items, newItem] };
        }
        return group;
      })
    );
    
    setSelectedItem(newItem);
    setViewMode('form');
  };

  // 🌟 3. 實作「刪除項目」函式
  const handleDeleteItem = (itemId: string) => {
    setSettingsData(prevData => 
      prevData.map(group => ({
        ...group,
        items: group.items.filter(item => item.id !== itemId)
      }))
    );
    
    if (selectedItem?.id === itemId) {
      setSelectedItem(null);
    }
  };

  // 🌟 1. 新增：處理「新增目錄」的函式
  const handleAddCategory = (newCategoryName: string) => {
    if (!newCategoryName.trim()) return;
    
    // 防呆機制：避免建立同名目錄
    if (settingsData.some(g => g.category === newCategoryName)) {
      alert("此目錄名稱已存在！");
      return;
    }

    // 在資料陣列的最後面，推入一個全新的空目錄
    setSettingsData(prev => [...prev, { category: newCategoryName, items: [] }]);
  };

  // 🌟 2. 新增：處理「刪除目錄」的函式
  const handleDeleteCategory = (categoryName: string) => {
    // 加上確認視窗，因為這會刪除整個資料夾的內容
    if (confirm(`確定要刪除「${categoryName}」目錄嗎？裡面的所有設定將會一併消失！`)) {
      setSettingsData(prev => prev.filter(g => g.category !== categoryName));
      
      // 如果目前選中的項目剛好在被刪除的目錄裡，就把畫面清空
      if (selectedItem?.category === categoryName || selectedItem?.category === 'custom') {
        setSelectedItem(null);
        setViewMode('form');
      }
    }
  };

  // 🌟 4. 如果尚未初始化，渲染「模板選擇畫面」
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
        
        {/* 🌟 4. 傳遞資料與新增/刪除函式給 Sidebar */}
        <SettingsSidebar 
          data={settingsData}
          onSelect={(item) => {
            setSelectedItem(item);
            setViewMode('form'); // 點擊目錄時，自動切回表單模式
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
            
            {/* 模式切換按鈕區 */}
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
                  {selectedItem.category === 'character' && <CharacterForm key={selectedItem.id} item={selectedItem} />}
                  {selectedItem.category === 'faction' && <FactionForm key={selectedItem.id} item={selectedItem} />}
                  {selectedItem.category === 'item' && <ItemForm key={selectedItem.id} item={selectedItem} />}
                  {selectedItem.category === 'event' && <EventForm key={selectedItem.id} item={selectedItem} />}
                  
                  {/* 🌟 拔掉原本的 CharacterForm，換成專屬的 DynamicForm */}
                  {(selectedItem.category === 'custom' || !['character', 'faction', 'item', 'event'].includes(selectedItem.category)) && (
                    <DynamicForm key={selectedItem.id} item={selectedItem} />
                  )}
                </div>
             ) : (
                <div className="w-full flex items-center justify-center rounded-lg border-2 border-dashed border-slate-200">
                  {/* 🌟 確保這裡有完整的 <span> 標籤 */}
                  <span className="text-slate-400">請從左側目錄選擇一個項目，或點擊右上角檢視全局視圖</span>
                </div>
             )}
          </div>
        </div>
      </main>
    </div>
  );
}