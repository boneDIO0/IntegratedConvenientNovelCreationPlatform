'use client'

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { SettingItem } from "@/types"; // 扣緊你核心的定義

interface LocationFormProps {
  item: SettingItem;
  allSettings: { category: string; items: SettingItem[] }[]; // 供未來如果需要關聯組織/上級地理使用
  onSave: (updatedItem: SettingItem) => void | Promise<void>; 
  onDirty?: () => void; 
}

export default function LocationForm({ item, allSettings, onSave, onDirty }: LocationFormProps) {
  // 🌟 完美同步 EventForm 的狀態機結構
  const [name, setName] = useState(item.name || "");
  const [climate, setClimate] = useState(item.climate || "");
  const [territory, setTerritory] = useState(item.territory || "");
  const [description, setDescription] = useState(item.description || "");
  const [color, setColor] = useState(item.color || "#3b82f6");
  const [saveStatus, setSaveStatus] = useState("儲存地點紀錄");

  // 當使用者在目錄點選切換不同地點時，刷新對應狀態值
  useEffect(() => {
    setName(item.name || "");
    setClimate(item.climate || "");
    setTerritory(item.territory || "");
    setDescription(item.description || "");
    setColor(item.color || "#3b82f6");
  }, [item]);

  const handleSaveClick = async () => {
    // 封裝成扁平化的 SettingItem 物件
    const updatedItem: SettingItem = {
      ...item,
      name,
      category: 'location', // 🔐 死死鎖定地理分類
      climate,
      territory,
      description,
    };

    setSaveStatus("儲存中...");

    try {
      await onSave(updatedItem);
      setSaveStatus("✅ 儲存成功！");
    } catch (error) {
      console.error("地點設定儲存出錯:", error);
      setSaveStatus("❌ 儲存失敗");
    }

    setTimeout(() => {
      setSaveStatus("儲存地點紀錄");
    }, 2000);
  };

  return (
    <div className="w-full h-full flex flex-col space-y-6">
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
        {/* 地點名稱 */}
        <div className="grid gap-2">
          <Label htmlFor="loc-name">地點名稱</Label>
          <Input 
            id="loc-name" 
            value={name} 
            placeholder="例如：高雄車站、清邁、浮空島"
            onChange={(e) => { setName(e.target.value); onDirty?.(); }} 
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="loc-climate">風土氣候設定</Label>
          <Input 
            id="loc-climate" 
            value={climate} 
            placeholder="例如：長年積雪、核心魔力輻射區、熱帶季風氣候"
            onChange={(e) => { setClimate(e.target.value); onDirty?.(); }} 
          />
        </div>

        {/* 地點簡介 / 背景故事 */}
        <div className="grid gap-2">
          <Label htmlFor="loc-desc">地點概述 / 背景設定</Label>
          <Textarea
            id="loc-desc"
            className="min-h-[180px] resize-none leading-relaxed"
            placeholder="敘述這個地方的地理環境、人文風情或特殊規則設定..."
            value={description}
            onChange={(e) => { setDescription(e.target.value); onDirty?.(); }}
          />
        </div>
      </div>

      {/* 頁尾儲存按鈕（100% 複製 EventForm 核心視覺） */}
      <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
        <button 
          onClick={handleSaveClick}
          disabled={saveStatus !== "儲存地點紀錄"}
          className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md font-medium transition-all shadow-sm"
        >
          {saveStatus} 
        </button>
      </div>
    </div>
  );
}