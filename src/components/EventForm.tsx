'use client'

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { SettingItem } from "@/lib/mockSettings"
import { formatFantasyDate, CalendarConfig } from "@/lib/calendarEngine" 
import { useState, useEffect } from "react" 

interface EventFormProps {
  item: SettingItem;
  calendarConfig?: CalendarConfig; 
  onSave: (updatedItem: SettingItem) => void | Promise<void>; 
  onDirty?: () => void; 
}

export default function EventForm({ item, calendarConfig, onSave, onDirty }: EventFormProps) {
  const [name, setName] = useState(item.name || "");
  const [currentDate, setCurrentDate] = useState(item.date || "");
  // 🌟 核心新增：新增手動輸入紀元文字的 State (對接 SettingItem 的擴充欄位)
  const [fantasyDisplay, setFantasyDisplay] = useState(item.fantasyDisplay || "");
  const [location, setLocation] = useState(item.location || "");
  const [description, setDescription] = useState(item.description || "");

  const [saveStatus, setSaveStatus] = useState("儲存事件紀錄");

  // 當切換選取不同歷史事件時，同步刷新狀態值
  useEffect(() => {
    setName(item.name || "");
    setCurrentDate(item.date || "");
    setFantasyDisplay(item.fantasyDisplay || "");
    setLocation(item.location || "");
    setDescription(item.description || "");
  }, [item]);

  // 檢查當前曆法全域模式：'standard' (自動換算) | 'fantasy_only' (手動輸入)
  const isStandardMode = calendarConfig?.mode !== "fantasy_only";

  // 🌟 核心修正：呼叫升級後的雙軌制引擎，把手動輸入的字串一併餵進去
  const displayDate = formatFantasyDate(currentDate, calendarConfig, fantasyDisplay);

  const handleSaveClick = async () => {
    const updatedItem: SettingItem = {
      ...item,
      name,
      // 雙軌制並存打包：
      date: isStandardMode ? currentDate : "", 
      fantasyDisplay: isStandardMode ? "" : fantasyDisplay, 
      sortWeight: isStandardMode ? undefined : (item.sortWeight ?? 0),
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
          <span className="text-slate-400 text-xs">
            {isStandardMode ? "引擎自動換算日期" : "寫手自訂紀元日期"}
          </span>
          <span className="text-xl font-bold tracking-wider text-emerald-400">
            {displayDate || (isStandardMode ? "請選擇標準時間..." : "請輸入世界觀時間...")}
          </span>
        </div>

        {/* 事件名稱 */}
        <div className="grid gap-2">
          <Label htmlFor="name">事件名稱</Label>
          <Input id="name" value={name} onChange={(e) => { setName(e.target.value); onDirty?.(); }} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 🌟 核心修正：依據多紀元全域配置，動態渲染時間輸入介面 */}
          {isStandardMode ? (
            <div className="grid gap-2">
              <Label htmlFor="date">標準時間 (YYYY-MM-DD)</Label>
              <Input 
                id="date" 
                type="date" 
                value={currentDate} 
                onChange={(e) => { setCurrentDate(e.target.value); onDirty?.(); }}
              />
            </div>
          ) : (
            <div className="contents md:grid md:grid-cols-3 gap-4 md:col-span-1">
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="fantasyDisplay">自訂世界觀時間文字</Label>
                <Input 
                  id="fantasyDisplay" 
                  type="text" 
                  placeholder="例如：創世曆 150 年 暮月 3 日"
                  value={fantasyDisplay} 
                  onChange={(e) => { setFantasyDisplay(e.target.value); onDirty?.(); }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sortWeight" className="flex items-center gap-1">
                  時間軸排序權重
                  <span title="數字越小越古老（排在時間軸越上方），例如 1 代表創世、10 代表當代" className="cursor-help text-slate-400">❓</span>
                </Label>
                <Input 
                  id="sortWeight" 
                  type="number" 
                  placeholder="如: 1"
                  // 💡 讀取或更新 item 的 sortWeight，記得作 Controlled 元件的空值保護
                  value={item.sortWeight ?? ""} 
                  onChange={(e) => { 
                    item.sortWeight = e.target.value ? parseInt(e.target.value) : undefined;
                    onDirty?.(); 
                  }}
                />
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="location">發生地點</Label>
            <Input 
              id="location" 
              value={location} 
              onChange={(e) => { setLocation(e.target.value); onDirty?.(); }} 
            />
          </div>
        </div>

        {/* 事件詳細經過 */}
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