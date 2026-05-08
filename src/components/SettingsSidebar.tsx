// src/components/SettingsSidebar.tsx
import { Plus, Trash2, Pencil, Check, X, FolderPlus } from "lucide-react";
import { SettingItem } from "@/lib/mockSettings";
import { useState } from "react";

interface SidebarProps {
  data: { category: string; items: SettingItem[] }[];
  onSelect: (item: SettingItem) => void;
  selectedId?: string;
  onAdd: (categoryName: string, type: 'character' | 'faction' | 'item' | 'event' | string) => void;
  onDelete: (itemId: string) => void;
  onAddCategory: (name: string) => void; 
  onDeleteCategory: (name: string) => void;
  onRenameCategory: (oldName: string, newName: string) => void; // 🌟 接收改名函式
}

export default function SettingsSidebar({ 
  data, onSelect, selectedId, onAdd, onDelete, onAddCategory, onDeleteCategory, onRenameCategory
}: SidebarProps) {
  
  // 控制新增目錄的狀態
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  
  // 🌟 控制「重新命名目錄」的狀態
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // 儲存改名結果
  const handleSaveRename = (oldName: string) => {
    if (editName.trim() && editName !== oldName) {
      onRenameCategory(oldName, editName);
    }
    setEditingCategory(null);
  };

  // 提交新目錄
  const submitNewCategory = () => {
    if (!newCategoryName.trim()) return;
    onAddCategory(newCategoryName);
    setNewCategoryName("");
    setIsAddingCategory(false);
  };

  const getTypeFromName = (name: string) => {
    if (name.includes("人物")) return 'character';
    if (name.includes("組織")) return 'faction';
    if (name.includes("物品")) return 'item';
    if (name.includes("事件")) return 'event';
    return 'custom'; 
  };

  return (
    <aside className="w-64 border-r border-slate-200 bg-white h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-800">設定集目錄</h2>
        <button 
          onClick={() => setIsAddingCategory(!isAddingCategory)}
          className="text-slate-400 hover:text-emerald-600 transition-colors"
          title="新增自訂目錄"
        >
          {isAddingCategory ? <X size={18} /> : <FolderPlus size={18} />}
        </button>
      </div>
      
      {isAddingCategory && (
        <div className="mb-6 flex gap-2">
          <input 
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="新目錄名稱..."
            className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-emerald-500"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitNewCategory();
              if (e.key === 'Escape') setIsAddingCategory(false);
            }}
          />
          <button 
            onClick={submitNewCategory}
            className="px-2 py-1 bg-emerald-500 text-white text-sm rounded-md hover:bg-emerald-600"
          >
            確定
          </button>
        </div>
      )}

      <div className="space-y-6 overflow-y-auto flex-1 pr-2">
        {data.map((group, index) => (
          <div key={index} className="group/category">
            
            <div className="flex items-center justify-between mb-2">
              
              {/* 🌟 條件渲染：判斷目前是否正在編輯這個目錄 */}
              {editingCategory === group.category ? (
                <div className="flex items-center gap-1 w-full mr-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-1 py-0.5 text-sm font-bold text-slate-700 border-b-2 border-emerald-500 focus:outline-none bg-emerald-50"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename(group.category);
                      if (e.key === 'Escape') setEditingCategory(null);
                    }}
                  />
                  <button onClick={() => handleSaveRename(group.category)} className="text-emerald-600 hover:bg-emerald-100 p-1 rounded">
                    <Check size={14} />
                  </button>
                  <button onClick={() => setEditingCategory(null)} className="text-red-500 hover:bg-red-100 p-1 rounded">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 
                    className="text-sm font-bold text-slate-700 cursor-pointer hover:text-emerald-600 transition-colors"
                    onDoubleClick={() => {
                      // 🌟 小彩蛋：除了點鉛筆，連點兩下名字也能觸發改名
                      setEditingCategory(group.category);
                      setEditName(group.category);
                    }}
                    title="連按兩下重新命名"
                  >
                    {group.category}
                  </h3>
                  
                  {/* Hover 時顯示的工具列 (改名、刪除) */}
                  <div className="flex opacity-0 group-hover/category:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setEditingCategory(group.category);
                        setEditName(group.category);
                      }}
                      className="text-slate-300 hover:text-blue-500 p-1"
                      title="重新命名目錄"
                    >
                      <Pencil size={12} />
                    </button>
                    <button 
                      onClick={() => onDeleteCategory(group.category)}
                      className="text-slate-300 hover:text-red-500 p-1"
                      title="刪除整個目錄"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}

              {/* 新增項目按鈕 (在編輯模式下隱藏，避免畫面太擠) */}
              {editingCategory !== group.category && (
                <button 
                  onClick={() => onAdd(group.category, getTypeFromName(group.category))}
                  className="text-slate-400 hover:text-emerald-600 transition-colors p-1"
                  title="在此目錄新增項目"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>
            
            <ul className="space-y-1">
              {group.items.map(item => (
                <li key={item.id} className="flex items-center justify-between group/item">
                  <button
                    onClick={() => onSelect(item)}
                    className={`flex-1 text-left px-3 py-2 rounded-md text-sm transition-colors truncate mr-1 ${
                      selectedId === item.id 
                        ? 'bg-slate-900 text-white font-medium' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {item.name}
                  </button>
                  <button 
                    onClick={() => onDelete(item.id)}
                    className="opacity-0 group-hover/item:opacity-100 text-slate-300 hover:text-red-500 p-1 transition-opacity"
                    title="刪除項目"
                  >
                    <Trash2 size={14} />
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