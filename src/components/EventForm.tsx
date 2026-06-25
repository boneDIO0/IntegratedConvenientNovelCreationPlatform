'use client'

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { SettingItem } from "@/lib/mockSettings"
// 🌟 1. 載入剛剛改好的自定義曆法型別與引擎
import { formatFantasyDate, CalendarConfig } from "@/lib/calendarEngine" 
import { useState } from "react" 

interface EventFormProps {
  item: SettingItem;
  // 🌟 2. 核心新增：從父層（SettingsPanel 或編輯器）傳入該專案在資料庫中的曆法參數
  calendarConfig?: CalendarConfig; 
  onSave: (updatedItem: SettingItem) => void | Promise<void>; 
  onDirty?: () => void; 
}

export default function EventForm({ item, calendarConfig, onSave, onDirty }: EventFormProps) {
  const [name, setName] = useState(item.name || "");
  const [currentDate, setCurrentDate] = useState(item.date || "");
  const [location, setLocation] = useState(item.location || "");
  const [description, setDescription] = useState(item.description || "");

  const [saveStatus, setSaveStatus] = useState("儲存事件紀錄");

  // 🌟 3. 將專案曆法配置傳入轉換引擎，落實真正的「參數驅動動態換算」
  const displayDate = formatFantasyDate(currentDate, calendarConfig);

  const handleSaveClick = async () => {
    const updatedItem: SettingItem = {
      ...item,
      name,
      date: currentDate,
      location,
      description
    };

    setSaveStatus("儲存中...");

    try {
      await onSave(updatedItem);
      setSaveStatus("✅ 儲存成功！");
    } catch (error) {
      console.error("歷史事件儲存出錯:", error);
      setSaveStatus("❌ 儲存失敗");
    }

    setTimeout(() => {
      setSaveStatus("儲存事件紀錄");
    }, 2000);
  };

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{name || "未命名事件"}</h2>
          <p className="text-sm text-slate-500 mt-1">關鍵歷史事件紀錄</p>
        </div>
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
          📜 歷史事件 (Event)
        </Badge>
      </div>

      <div className="space-y-5 flex-1">
        {/* 曆法引擎展示區塊 */}
        <div className="p-4 rounded-lg bg-slate-900 text-white shadow-inner flex flex-col gap-1 transition-colors">
          <span className="text-slate-400 text-xs">世界觀換算時間</span>
          <span className="text-xl font-bold tracking-wider text-emerald-400">
            {displayDate}
          </span>
        </div>

        {/* 事件名稱的輸入框 */}
        <div className="grid gap-2">
          <Label htmlFor="name">事件名稱</Label>
          <Input id="name" value={name} onChange={(e) => { setName(e.target.value); onDirty?.(); }} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="date">標準時間 (YYYY-MM-DD)</Label>
            <Input 
              id="date" 
              type="date" 
              value={currentDate} 
              onChange={(e) => { setCurrentDate(e.target.value); onDirty?.(); }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="location">發生地點</Label>
            <Input 
              id="location" 
              value={location} 
              onChange={(e) => { setLocation(e.target.value); onDirty?.(); }} 
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">事件詳細經過</Label>
          <Textarea
            id="description"
            className="min-h-[150px] resize-none leading-relaxed"
            value={description}
            onChange={(e) => { setDescription(e.target.value); onDirty?.(); }}
          />
        </div>

        {/* 牽涉對象顯示區塊 */}
        <div className="grid gap-2">
          <Label className="font-bold text-slate-700">牽涉對象</Label>
          <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50">
            {item.relations && item.relations.length > 0 ? (
              item.relations.map((rel, index) => (
                <Badge key={index} variant="secondary" className="text-sm py-1 bg-white border-slate-200 shadow-sm">
                  與 {rel.targetId} ({rel.type})
                </Badge>
              ))
            ) : (
              <span className="text-sm text-slate-400">目前無牽涉其他項目</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
        <button 
          onClick={handleSaveClick}
          disabled={saveStatus !== "儲存事件紀錄"}
          className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md font-medium transition-all shadow-sm"
        >
          {saveStatus} 
        </button>
      </div>
    </div>
  )
}