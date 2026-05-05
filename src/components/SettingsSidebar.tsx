// src/components/SettingsSidebar.tsx
import { SettingItem } from "@/lib/mockSettings";
import { useState } from "react"; // 🌟 引入 useState 控制輸入框

// 🌟 擴充 Props 接收新的函式
interface SidebarProps {
  data: { category: string; items: SettingItem[] }[];
  onSelect: (item: SettingItem) => void;
  selectedId?: string;
  onAdd: (categoryName: string, type: 'character' | 'faction' | 'item' | 'event' | string) => void;
  onDelete: (itemId: string) => void;
  onAddCategory: (name: string) => void;       // 👈 新增
  onDeleteCategory: (name: string) => void;    // 👈 新增
}

export default function SettingsSidebar({ 
  data, onSelect, selectedId, onAdd, onDelete, onAddCategory, onDeleteCategory 
}: SidebarProps) {
  
  // 🌟 控制「新增目錄」輸入框的狀態
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const submitNewCategory = () => {
    onAddCategory(newCategoryName);
    setNewCategoryName("");
    setIsAddingCategory(false);
  };

  // 輔助函式：現在如果是不認識的新目錄，我們統一給予 'custom' 類型
  const getTypeFromName = (name: string) => {
    if (name.includes("人物")) return 'character';
    if (name.includes("組織")) return 'faction';
    if (name.includes("物品")) return 'item';
    if (name.includes("事件")) return 'event';
    return 'custom'; // 🌟 未知的自訂目錄都歸類為 custom
  };

  return (
    <aside className="w-64 border-r border-slate-200 bg-white h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-800">設定集目錄</h2>
        {/* 🌟 切換輸入框顯示的按鈕 */}
        <button 
          onClick={() => setIsAddingCategory(!isAddingCategory)}
          className="text-slate-400 hover:text-emerald-600 transition-colors"
          title="新增自訂目錄"
        >
          {isAddingCategory ? '✕' : '➕'}
        </button>
      </div>
      
      {/* 🌟 新增目錄的輸入區域 */}
      {isAddingCategory && (
        <div className="mb-6 flex gap-2">
          <input 
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="新目錄名稱..."
            className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-emerald-500"
            onKeyDown={(e) => e.key === 'Enter' && submitNewCategory()}
          />
          <button 
            onClick={submitNewCategory}
            className="px-2 py-1 bg-emerald-500 text-white text-sm rounded-md hover:bg-emerald-600"
          >
            確定
          </button>
        </div>
      )}

      {/* 🌟 下方為目錄列表的捲動區塊 */}
      <div className="space-y-6 overflow-y-auto flex-1 pr-2">
        {data.map((group, index) => (
          // 加入 group 類別，用來觸發 hover 顯示垃圾桶
          <div key={index} className="group/category">
            
            {/* 分類標題區塊 */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-700">{group.category}</h3>
                
                {/* 🌟 刪除目錄按鈕 (Hover 才會出現) */}
                <button 
                  onClick={() => onDeleteCategory(group.category)}
                  className="opacity-0 group-hover/category:opacity-100 text-slate-300 hover:text-red-500 transition-opacity text-xs"
                  title="刪除整個目錄"
                >
                  🗑️
                </button>
              </div>

              {/* 新增項目按鈕 */}
              <button 
                onClick={() => onAdd(group.category, getTypeFromName(group.category))}
                className="text-slate-400 hover:text-emerald-600 transition-colors"
                title="在此目錄新增項目"
              >
                ➕
              </button>
            </div>
            
            {/* 項目列表 (保持不變) */}
            <ul className="space-y-1">
              {group.items.map(item => (
                <li key={item.id} className="flex items-center justify-between group/item">
                  <button
                    onClick={() => onSelect(item)}
                    className={`flex-1 text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedId === item.id 
                        ? 'bg-slate-900 text-white font-medium' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {item.name}
                  </button>
                  <button 
                    onClick={() => onDelete(item.id)}
                    className="opacity-0 group-hover/item:opacity-100 text-slate-300 hover:text-red-500 px-2 transition-opacity"
                    title="刪除項目"
                  >
                    🗑️
                  </button>
                </li>
              ))}
              {group.items.length === 0 && (
                <li className="text-xs text-slate-400 px-3 py-1 italic">此目錄為空</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}