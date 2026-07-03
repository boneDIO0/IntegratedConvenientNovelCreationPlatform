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
  const [location, setLocation] = useState(item.location || "");
  const [description, setDescription] = useState(item.description || "");
  const [saveStatus, setSaveStatus] = useState("儲存事件紀錄");

  // 🌟 核心結構優化：將原本的死板字串拆解為連動的「紀元名稱」與「年份」狀態，徹底防呆
  const [selectedEra, setSelectedEra] = useState("");
  const [fantasyYear, setFantasyYear] = useState<number | "">("");

  // 檢查當前曆法全域模式：'standard' (自動換算) | 'fantasy_only' (純自訂拖曳排序)
  const isStandardMode = calendarConfig?.mode !== "fantasy_only";

  // 當切換選取不同歷史事件時，同步刷新與拆解狀態值
  useEffect(() => {
    setName(item.name || "");
    setCurrentDate(item.date || "");
    setLocation(item.location || "");
    setDescription(item.description || "");

    if (!isStandardMode) {
      // 試圖從既存的 "舊紀元 1 年" 字串中拆解出紀元與年份
      const displayStr = item.fantasyDisplay || "";
      const matched = displayStr.match(/^(.+?)\s*(\d+)\s*年$/);
      
      if (matched) {
        setSelectedEra(matched[1]);
        setFantasyYear(parseInt(matched[2], 10));
      } else {
        // 如果是全新事件，預設選取曆法中的第一個歷史紀元
        const firstEraName = calendarConfig?.eras?.[0]?.name || "";
        setSelectedEra(firstEraName);
        setFantasyYear(1);
      }
    }
  }, [item, calendarConfig, isStandardMode]);

  // 🌟 動態即時合成預覽文字
  const generatedFantasyDisplay = selectedEra && fantasyYear !== "" ? `${selectedEra} ${fantasyYear} 年` : "";
  const displayDate = isStandardMode 
    ? formatFantasyDate(currentDate, calendarConfig, "")
    : generatedFantasyDisplay;

  const handleSaveClick = async () => {
    let calculatedWeight = item.sortWeight ?? 0;

    // 🌟 核心權重演算法：如果開啟了自訂曆法模式，依據目前所選紀元在曆法中的物理拖曳順序，自動權重定錨！
    if (!isStandardMode && calendarConfig?.eras) {
      const eraIndex = calendarConfig.eras.findIndex(e => e.name === selectedEra);
      const safeIndex = eraIndex !== -1 ? eraIndex : 0;
      const safeYear = fantasyYear !== "" ? fantasyYear : 1;
      
      // 公式：(曆法陣列排序 * 100,000) + 當前年份。保證拖曳順序永遠具有最高優先權！
      calculatedWeight = safeIndex * 100000 + safeYear;
    }

    const updatedItem: SettingItem = {
      ...item,
      name,
      location,
      description,
      date: isStandardMode ? currentDate : "", 
      fantasyDisplay: isStandardMode ? "" : generatedFantasyDisplay, 
      sortWeight: calculatedWeight // 鎖定完美物理排序數字
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
            {isStandardMode ? "引擎自動換算日期" : "世界觀曆法時序對齊預覽"}
          </span>
          <span className="text-xl font-bold tracking-wider text-emerald-400">
            {displayDate || (isStandardMode ? "請選擇標準時間..." : "請選擇自訂紀元時序...")}
          </span>
        </div>

        {/* 事件名稱 */}
        <div className="grid gap-2">
          <Label htmlFor="name">事件名稱</Label>
          <Input id="name" value={name} onChange={(e) => { setName(e.target.value); onDirty?.(); }} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 🌟 核心重構：雙軌制連動分流 */}
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
            <div className="grid grid-cols-3 gap-3 md:col-span-1">
              {/* 紀元名稱下拉選單 */}
              <div className="grid gap-2 col-span-2">
                <Label htmlFor="eraSelect">選擇歷史紀元時期</Label>
                <select
                  id="eraSelect"
                  value={selectedEra}
                  onChange={(e) => { setSelectedEra(e.target.value); onDirty?.(); }}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  {calendarConfig?.eras && calendarConfig.eras.length > 0 ? (
                    calendarConfig.eras.map((era, index) => (
                      <option key={`${era.name}-${index}`} value={era.name} className="text-slate-800">
                        ✨ {era.name}
                      </option>
                    ))
                  ) : (
                    <option value="">(請先至曆法設定建立時期)</option>
                  )}
                </select>
              </div>

              {/* 年份數字輸入框 */}
              <div className="grid gap-2 col-span-1">
                <Label htmlFor="eraYear">發生年份</Label>
                <Input 
                  id="eraYear" 
                  type="number" 
                  min={1}
                  placeholder="如: 1"
                  value={fantasyYear} 
                  onChange={(e) => { 
                    const val = e.target.value;
                    setFantasyYear(val === "" ? "" : parseInt(val, 10)); 
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