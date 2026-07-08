'use client'

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SettingItem } from "@/types" // 🎯 確保維持與專案一致的中心型別定義
import { useState, useEffect } from "react" 

// 🌟 擴充 Interface：正式接收全域設定源 allSettings
interface ItemFormProps {
  item: SettingItem;
  allSettings: { category: string; items: SettingItem[] }[]; // 注入全域大資料庫
  onSave: (updatedItem: SettingItem) => void | Promise<void>; 
  onDirty?: () => void; 
}

export default function ItemForm({ item, allSettings, onSave, onDirty }: ItemFormProps) {
  
  // 使用狀態管理表單欄位
  const [name, setName] = useState(item.name || "");
  const [itemType, setItemType] = useState(item.itemType || "artifact");
  const [resonanceEffect, setResonanceEffect] = useState(item.resonanceEffect || "");
  const [description, setDescription] = useState(item.description || "");
  
  // 🌟 管理關係陣列狀態（包含擁有者、隸屬組織等關係圖譜核心）
  const [relations, setRelations] = useState<{targetId: string, type: string}[]>(item.relations || []);
  const [saveStatus, setSaveStatus] = useState("儲存物品設定");

  // 🔍 全方位模糊防禦：從全域資料中撈出所有「人物」與「組織」
  const availableCharacters = allSettings?.find((c: any) => {
    const cat = (c.category || c.categoryName || "").toLowerCase();
    return cat.includes("character") || cat.includes("人物") || cat.includes("角色");
  })?.items || [];

  const availableFactions = allSettings?.find((c: any) => {
    const cat = (c.category || c.categoryName || "").toLowerCase();
    return cat.includes("faction") || cat.includes("組織") || cat.includes("陣營");
  })?.items || [];

  // 當使用者在側邊欄切換不同物品時，精準同步刷新狀態值
  useEffect(() => {
    setName(item.name || "");
    setItemType(item.itemType || "artifact");
    setResonanceEffect(item.resonanceEffect || "");
    setDescription(item.description || "");
    setRelations(item.relations || []);
  }, [item]);

  // 🌟 處理對象勾選/取消勾選的邏輯
  const handleRelationToggle = (targetName: string, defaultType: string) => {
    onDirty?.();
    const exists = relations.some(r => r.targetId === targetName);
    if (exists) {
      // 如果已經建立關聯，點擊則解除
      setRelations(relations.filter(r => r.targetId !== targetName));
    } else {
      // 如果未關聯，點擊則新增關係（預設類型如 '持有者'、'所屬勢力'）
      setRelations([...relations, { targetId: targetName, type: defaultType }]);
    }
  };

  // 實作非同步存檔邏輯
  const handleSaveClick = async () => {
    const updatedItem: SettingItem = {
      ...item,
      name,
      itemType: itemType as "weapon" | "artifact" | "consumable" | "skill", 
      resonanceEffect,
      description,
      relations // 🌟 將全新勾選綁定的關係陣列送回後端資料庫
    };

    setSaveStatus("儲存中...");

    try {
      await onSave(updatedItem);
      setSaveStatus("✅ 儲存成功！");
    } catch (error) {
      console.error("物品設定儲存出錯:", error);
      setSaveStatus("❌ 儲存失敗");
    }

    setTimeout(() => {
      setSaveStatus("儲存物品設定");
    }, 2000);
  };

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'weapon': return { text: '常規武器 (Weapon)', color: 'bg-red-50 text-red-700 border-red-200' };
      case 'consumable': return { text: '消耗品 (Consumable)', color: 'bg-green-50 text-green-700 border-green-200' };
      case 'skill': return { text: '特殊技能 (Skill)', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'artifact':
      default: return { text: '古代遺物/聖物 (Artifact)', color: 'bg-purple-50 text-purple-700 border-purple-200' };
    }
  };

  const typeInfo = getTypeInfo(itemType);

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{name || "未命名物品"}</h2>
          <p className="text-sm text-slate-500 mt-1">特殊物品與技能設定</p>
        </div>
        <Badge variant="outline" className={`${typeInfo.color} transition-colors`}>
          {typeInfo.text}
        </Badge>
      </div>

      <div className="space-y-5 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">物品/技能名稱</Label>
            <Input 
              id="name" 
              value={name} 
              onChange={(e) => { setName(e.target.value); onDirty?.(); }} 
            /> 
          </div>
          <div className="grid gap-2">
            <Label htmlFor="itemType">類型</Label>
            <Select 
              value={itemType} 
              onValueChange={(value) => { 
                setItemType(value as "weapon" | "artifact" | "consumable" | "skill"); 
                onDirty?.(); 
              }}
            >
              <SelectTrigger id="itemType" className="bg-white">
                <SelectValue placeholder="選擇類型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weapon">常規武器</SelectItem>
                <SelectItem value="artifact">古代遺物 / 聖物</SelectItem>
                <SelectItem value="consumable">消耗品</SelectItem>
                <SelectItem value="skill">特殊技能</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 核心機制：共鳴效果 */}
        <div className="grid gap-2 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <Label htmlFor="resonance" className="text-amber-900 font-bold flex items-center gap-2">
            ✨ 共鳴效果 (Resonance Effect)
          </Label>
          <p className="text-xs text-amber-700 mb-2">
            請避免填寫絕對數值。描述此{itemType === 'skill' ? '技能' : '物品'}如何與環境、物理法則或使用者精神產生互動。
          </p>
          <Textarea
            id="resonance"
            className="min-h-[100px] resize-none border-amber-300 focus-visible:ring-amber-500 bg-white leading-relaxed"
            value={resonanceEffect}
            onChange={(e) => { setResonanceEffect(e.target.value); onDirty?.(); }}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">外觀與歷史背景</Label>
          <Textarea
            id="description"
            className="min-h-[100px] resize-none leading-relaxed"
            value={description}
            onChange={(e) => { setDescription(e.target.value); onDirty?.(); }}
          />
        </div>

        {/* 🌟 核心升級：動態關聯面板（完美對齊 EventForm 規格） */}
        <div className="grid gap-4">
          {/* 1. 綁定人物 (持有者/使用者) */}
          <div className="grid gap-2">
            <Label className="font-bold text-slate-700">👤 持有者 / 使用角色 (點擊以綁定人物)</Label>
            <div className="flex flex-wrap gap-2 p-3.5 rounded-xl border border-slate-200 bg-slate-50 min-h-[60px]">
              {availableCharacters.length > 0 ? (
                availableCharacters.map((char: SettingItem) => {
                  const isSelected = relations.some(r => r.targetId === char.name);
                  return (
                    <button
                      key={char.id}
                      type="button"
                      onClick={() => handleRelationToggle(char.name || "", itemType === 'skill' ? '使用者' : '持有者')}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-all duration-200 shadow-sm flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-slate-900 text-white border-slate-950 scale-105"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      <span>{isSelected ? "✅" : "👤"}</span>
                      <span>{char.name}</span>
                    </button>
                  );
                })
              ) : (
                <span className="text-sm text-slate-400 m-auto">請先至人物分頁建立世界觀角色</span>
              )}
            </div>
          </div>

          {/* 2. 綁定陣營 (所屬勢力) */}
          <div className="grid gap-2">
            <Label className="font-bold text-slate-700">🏛️ 出產 / 隸屬勢力組織 (點擊以綁定陣營)</Label>
            <div className="flex flex-wrap gap-2 p-3.5 rounded-xl border border-slate-200 bg-slate-50 min-h-[60px]">
              {availableFactions.length > 0 ? (
                availableFactions.map((fac: SettingItem) => {
                  const isSelected = relations.some(r => r.targetId === fac.name);
                  return (
                    <button
                      key={fac.id}
                      type="button"
                      onClick={() => handleRelationToggle(fac.name || "", '所屬組織')}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-all duration-200 shadow-sm flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-amber-600 text-white border-amber-700 scale-105"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      <span>{isSelected ? "✅" : "🏛️"}</span>
                      <span>{fac.name}</span>
                    </button>
                  );
                })
              ) : (
                <span className="text-sm text-slate-400 m-auto">請先至組織分頁建立歷史陣營</span>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 底部控制區 */}
      <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
        <button 
          onClick={handleSaveClick}
          disabled={saveStatus !== "儲存物品設定"}
          className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md font-medium transition-all shadow-sm"
        >
          {saveStatus} 
        </button>
      </div>
    </div>
  )
}