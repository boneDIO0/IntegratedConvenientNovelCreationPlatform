'use client'

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { SettingItem } from "@/types";

interface LocationFormProps {
  item: SettingItem;
  allSettings: { category: string; items: SettingItem[] }[];
  onSave: (updatedItem: SettingItem) => void | Promise<void>; 
  onDirty?: () => void; 
}

export default function LocationForm({ item, allSettings, onSave, onDirty }: LocationFormProps) {
  const itemContent = (item as any).content && typeof (item as any).content === 'object' 
    ? (item as any).content 
    : {};

  const [name, setName] = useState(item.name || item.title || "");
  const [climate, setClimate] = useState(itemContent.climate || item.climate || "");
  const [territory, setTerritory] = useState(itemContent.territory || item.territory || "");
  const [description, setDescription] = useState(itemContent.description || item.description || "");
  const [parentId, setParentId] = useState(itemContent.parentId || item.parentId || "");
  const [color, setColor] = useState(itemContent.color || item.color || "#3b82f6");
  const [isSaving, setIsSaving] = useState(false);

  const allLocations = allSettings?.find(
    (c: any) => {
      const cat = (c.category || c.categoryName || "").toLowerCase();
      return cat.includes("location") || cat.includes("地點");
    }
  )?.items || [];
  
  const possibleParentLocations = allLocations.filter((loc: SettingItem) => loc.id !== item.id);

  useEffect(() => {
    const content = (item as any).content && typeof (item as any).content === 'object' 
      ? (item as any).content 
      : {};

    setName(item.name || item.title || "");
    setClimate(content.climate || item.climate || "");
    setTerritory(content.territory || item.territory || "");
    setDescription(content.description || item.description || "");
    setParentId(content.parentId || item.parentId || "");
    setColor(content.color || item.color || "#3b82f6");
  }, [item]);

  const handleSaveClick = async () => {
    if (isSaving) return;

    const currentContent = {
      ...(item as any).content,
      climate,
      territory,
      description,
      parentId: parentId || undefined,
      color
    };

    const updatedItem = {
      ...item,
      name,
      title: name,
      category: 'location',
      climate,
      territory,
      description,
      parentId: parentId || undefined,
      color,
      content: currentContent
    } as SettingItem;

    try {
      setIsSaving(true);
      await onSave(updatedItem);
    } catch (error) {
      console.error("地點設定儲存出錯:", error);
      alert("❌ 儲存失敗，請檢查網路連線");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full min-h-full flex flex-col space-y-6 pb-24">
      {/* 頁首標題區 */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{name || "未命名地點"}</h2>
          <p className="text-sm text-slate-500 mt-1">地理環境與風土設定</p>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          📍 地點要素 (Location)
        </Badge>
      </div>

      {/* 主要輸入表單欄位 */}
      <div className="space-y-5 flex-1">
        <div className="grid gap-2">
          <Label htmlFor="loc-name">地點/分區名稱</Label>
          <Input id="loc-name" value={name} onChange={(e) => { setName(e.target.value); onDirty?.(); }} />
        </div>

        {/* 隸屬大分區下拉選單 */}
        <div className="grid gap-2">
          <Label htmlFor="loc-parent">隸屬大分區 (選填)</Label>
          <select
            id="loc-parent"
            value={parentId}
            onChange={(e) => { setParentId(e.target.value); onDirty?.(); }}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors text-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400"
          >
            <option value="">-- 獨立大分區 (無上級) --</option>
            {possibleParentLocations.map((loc: SettingItem) => (
              <option key={loc.id} value={loc.id}>
                🏰 {loc.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="loc-climate">風土氣候設定</Label>
          <Input id="loc-climate" value={climate} onChange={(e) => { setClimate(e.target.value); onDirty?.(); }} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="loc-desc">地點概述</Label>
          <Textarea id="loc-desc" className="min-h-[120px] resize-none" value={description} onChange={(e) => { setDescription(e.target.value); onDirty?.(); }} />
        </div>
      </div>

      {/* 頁尾儲存按鈕 */}
      <div className="flex justify-end gap-2 pt-6 pb-6 border-t border-slate-100">
        <button 
          onClick={handleSaveClick}
          disabled={isSaving}
          className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-md active:scale-95 cursor-pointer"
        >
          {isSaving ? "儲存中..." : "儲存地點紀錄"} 
        </button>
      </div>
    </div>
  );
}