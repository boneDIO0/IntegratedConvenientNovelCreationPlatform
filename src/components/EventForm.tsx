'use client'

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { SettingItem } from "@/lib/mockSettings"
import { formatFantasyDate } from "@/lib/calendarEngine" 
import { useState } from "react" 

// 🌟 1. 調整 Interface 接收非同步 onSave 與髒數據監聽
interface EventFormProps {
  item: SettingItem;
  onSave: (updatedItem: SettingItem) => void | Promise<void>; // 支援 Promise 等待
  onDirty?: () => void; // 讓欄位打字時能秒通知父層亮起 *(已修改) 標籤
}

export default function EventForm({ item, onSave, onDirty }: EventFormProps) {
  // 🌟 2. 建立所有欄位的 state
  const [name, setName] = useState(item.name || "");
  const [currentDate, setCurrentDate] = useState(item.date || "");
  const [location, setLocation] = useState(item.location || "");
  const [description, setDescription] = useState(item.description || "");

  // 🌟 3. 核心新增：管理按鈕文字與動畫的狀態
  const [saveStatus, setSaveStatus] = useState("儲存事件紀錄");

  // 將標準時間轉成世界觀時間 (會根據 currentDate 即時重新計算)
  const displayDate = formatFantasyDate(currentDate);

  // 🌟 4. 實作非同步存檔邏輯 (穩穩加上 async)
  const handleSaveClick = async () => {
    const updatedItem: SettingItem = {
      ...item,
      name,
      date: currentDate,
      location,
      description
    };

    // 🎬 狀態 A：進入儲存中
    setSaveStatus("儲存中...");

    try {
      // 🌟 靜靜等待雲端 Neon PostgreSQL 交易回傳成功
      await onSave(updatedItem);
      
      // 🎬 狀態 B：顯示成功綠勾
      setSaveStatus("✅ 儲存成功！");
    } catch (error) {
      console.error("歷史事件儲存出錯:", error);
      setSaveStatus("❌ 儲存失敗");
    }

    // 🎬 狀態 C：2 秒後重置按鈕狀態
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

      {/* 🌟 5. 底部控制區：啟用鎖定防禦，避免作者多點連擊 */}
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