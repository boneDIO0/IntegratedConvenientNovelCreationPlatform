'use client';

import { useState, useEffect } from "react";
import { SettingItem } from "@/types";
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical, History } from "lucide-react";
import { VersionHistory } from "./VersionHistory";

interface ActStructureFormProps {
  item: SettingItem;
  onSave: (updatedItem: SettingItem) => Promise<void>;
  onRefresh: () => Promise<void>;
  isEditable?: boolean;
  onDirty?: () => void;
}

type ActKey = 'act1' | 'act2' | 'act3';
interface Scene {
  id: string;
  content: string;
}

const ACT_TITLES: Record<ActKey, string> = {
  act1: "第一幕 (起：鋪陳與觸發)",
  act2: "第二幕 (承轉：衝突與考驗)",
  act3: "第三幕 (合：高潮與結局)"
};

export default function ActStructureForm({ item, onSave, onRefresh, onDirty, isEditable = true }: ActStructureFormProps) {
  const [title, setTitle] = useState(item.name || "");
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // 取出版本
  const versions = (item as any).versions || (item as any).content?.versions || [];
  
  const [acts, setActs] = useState<Record<ActKey, Scene[]>>(() => {
    const possibleActs = (item as any).content?.acts || (item as any).acts;

    if (possibleActs && Object.keys(possibleActs).length > 0) {
      return possibleActs;
    }
    
    return {
      act1: [{ id: crypto.randomUUID(), content: "" }],
      act2: [{ id: crypto.randomUUID(), content: "" }],
      act3: [{ id: crypto.randomUUID(), content: "" }]
    };
  });

  useEffect(() => {
    setTitle(item.name || "");
    const possibleActs = (item as any).content?.acts || (item as any).acts;
    
    if (possibleActs && Object.keys(possibleActs).length > 0) {
      setActs(possibleActs);
    } else {
      setActs({
        act1: [{ id: crypto.randomUUID(), content: "" }],
        act2: [{ id: crypto.randomUUID(), content: "" }],
        act3: [{ id: crypto.randomUUID(), content: "" }]
      });
    }
  }, [item]);

  const handleAddScene = (actKey: ActKey) => {
    if (!isEditable) return;
    setActs(prev => ({
      ...prev,
      [actKey]: [...prev[actKey], { id: crypto.randomUUID(), content: "" }]
    }));
    onDirty?.();
  };

  const handleInsertScene = (actKey: ActKey, insertAfterIndex: number) => {
    if (!isEditable) return;
    setActs(prev => {
      const currentList = [...prev[actKey]];
      // 在指定的 index 之後的位置 (index + 1)，插入一個全新的卡片
      currentList.splice(insertAfterIndex + 1, 0, { id: crypto.randomUUID(), content: "" });
      return {
        ...prev,
        [actKey]: currentList
      };
    });
    onDirty?.();
  };

  const handleUpdateScene = (actKey: ActKey, id: string, newContent: string) => {
    if (!isEditable) return;
    setActs(prev => ({
      ...prev,
      [actKey]: prev[actKey].map(scene => scene.id === id ? { ...scene, content: newContent } : scene)
    }));
    onDirty?.();
  };

  const handleDeleteScene = (actKey: ActKey, id: string) => {
    if (!isEditable) return;
    setActs(prev => ({
      ...prev,
      [actKey]: prev[actKey].filter(scene => scene.id !== id)
    }));
    onDirty?.();
  };

  const handleMoveScene = (actKey: ActKey, index: number, direction: 'up' | 'down') => {
    if (!isEditable) return;
    
    setActs(prev => {
      const currentList = [...prev[actKey]];
      
      // 往上移且不是第一個
      if (direction === 'up' && index > 0) {
        const temp = currentList[index - 1];
        currentList[index - 1] = currentList[index];
        currentList[index] = temp;
      } 
      // 往下移且不是最後一個
      else if (direction === 'down' && index < currentList.length - 1) {
        const temp = currentList[index + 1];
        currentList[index + 1] = currentList[index];
        currentList[index] = temp;
      } else {
        return prev; // 無法移動則保持原樣
      }

      return {
        ...prev,
        [actKey]: currentList
      };
    });
    onDirty?.();
  };

  const handleSave = async () => {
    if (!isEditable) return;
    setIsSaving(true);
    
    const updatedItem = {
      ...item,
      name: title,
      content: {
        ...((item as any).content || {}),
        acts: acts
      }
    };
    
    await onSave(updatedItem);
    setIsSaving(false);
  };

  // 還原版本 API
  const handleRestoreVersion = async (ts: number) => {
    if (!confirm("確定要還原到此歷史版本嗎？\n目前未儲存的變更將會遺失。")) return;
    try {
      const res = await fetch(`/api/notes/${item.id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp: ts })
      });
      if (res.ok) {
        setShowHistory(false);
        await onRefresh();
        alert("🎉 大綱已成功還原！");
      }
    } catch (e) {
      console.error(e);
      alert("還原失敗");
    }
  };

  // 刪除版本 API
  const handleDeleteVersion = async (ts: number) => {
    if (!confirm("確定要刪除此條歷史備份嗎？此動作無法復原。")) return;
    try {
      const res = await fetch(`/api/notes/${item.id}/versions/${ts}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="relative flex flex-col h-full space-y-4 animate-in fade-in duration-300">
      
      {!isEditable && (
        <div className="flex items-center gap-2 rounded-md bg-amber-50/50 border border-amber-200 p-3 text-sm text-amber-800 shrink-0">
          🔒 <span className="font-medium">唯讀模式</span>：您目前正在檢視大綱，沒有編輯權限。
        </div>
      )}

      <input
        type="text"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          onDirty?.();
        }}
        placeholder="大綱標題..."
        disabled={!isEditable}
        className="text-2xl font-bold border-b border-transparent hover:border-amber-200 focus:border-amber-400 focus:outline-none bg-transparent px-2 py-1 transition-colors text-slate-800 placeholder-slate-300 w-full disabled:opacity-80 disabled:cursor-not-allowed shrink-0"
      />

      <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-4 custom-scrollbar pr-1">
        {(Object.keys(ACT_TITLES) as ActKey[]).map((actKey) => (
          <div key={actKey} className="flex flex-col bg-slate-100/70 rounded-2xl border border-slate-200 p-4 shadow-inner min-h-[160px] shrink-0">
            
            <div className="flex items-center justify-between px-1 mb-4 border-b border-slate-200/60 pb-2">
              <h3 className="font-bold text-slate-700 text-sm">{ACT_TITLES[actKey]}</h3>
              {isEditable && (
                <button 
                  onClick={() => handleAddScene(actKey)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-amber-600 hover:border-amber-300 shadow-sm transition-all"
                  title="新增場景卡片"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {acts[actKey].map((scene, index) => (
                <div key={scene.id} className="relative flex flex-col items-center">
                  
                  <div className="group flex flex-col bg-white w-full rounded-xl shadow-sm border border-slate-200 p-3 focus-within:ring-2 focus-within:ring-amber-400 transition-all hover:shadow-md z-10">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <span className="text-[11px] font-bold tracking-wider">SCENE {index + 1}</span>
                      </div>
                    
                      {isEditable && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleMoveScene(actKey, index, 'up')} 
                            disabled={index === 0} 
                            className="p-1 text-slate-400 hover:text-amber-600 disabled:opacity-30" 
                            title="往上移動"
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button 
                            onClick={() => handleMoveScene(actKey, index, 'down')} 
                            disabled={index === acts[actKey].length - 1} 
                            className="p-1 text-slate-400 hover:text-amber-600 disabled:opacity-30" 
                            title="往下移動"
                          >
                            <ChevronDown size={16} />
                          </button>
                          <div className="w-px h-3 bg-slate-200 mx-0.5"></div>
                          <button onClick={() => handleDeleteScene(actKey, scene.id)} className="p-1 text-slate-400 hover:text-red-500" title="刪除場景">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    <textarea
                      value={scene.content}
                      onChange={(e) => handleUpdateScene(actKey, scene.id, e.target.value)}
                      disabled={!isEditable}
                      placeholder={isEditable ? "描述這個場景發生的事情..." : "無內容"}
                      className="w-full resize-none outline-none text-sm text-slate-700 bg-transparent min-h-[80px] leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                      rows={4}
                    />
                  </div>

                  {isEditable && (
                    <div className="w-full h-3 flex items-center justify-center -my-1.5 z-20 opacity-0 hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleInsertScene(actKey, index)}
                        className="bg-amber-100 text-amber-600 border border-amber-300 rounded-full p-1 hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all shadow-sm"
                        title="在此處插入新場景"
                      >
                        <Plus size={14} />
                      </button>
                      <div className="absolute w-full h-[1px] bg-amber-300 -z-10 left-0"></div>
                    </div>
                  )}
                </div>
              ))}

              {acts[actKey].length === 0 && (
                <div className="text-center text-xs text-slate-400 py-6 border-2 border-dashed border-slate-200 rounded-xl">
                  無場景卡片
                </div>
              )}
            </div>

          </div>
        ))}
      </div>

      {isEditable && (
        <div className="flex items-center justify-end gap-3 pt-2 shrink-0 border-t border-slate-200 mt-2">
          {/* 帶文字與圖示的歷史按鈕 */}
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all border ${
              showHistory
                ? "bg-purple-600 border-purple-600 text-white hover:bg-purple-700 shadow-sm"
                : "bg-purple-50 border-purple-100 text-purple-700 hover:bg-purple-100"
            }`}
          >
            <History size={16} /> 歷史紀錄
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-6 rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            {isSaving ? "儲存中..." : "💾 儲存大綱結構"}
          </button>
          
          {showHistory && (
            <VersionHistory 
              versions={versions} 
              onRestore={handleRestoreVersion} 
              onDelete={handleDeleteVersion} 
              onClose={() => setShowHistory(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}