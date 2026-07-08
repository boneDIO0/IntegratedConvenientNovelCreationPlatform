'use client'

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { SettingItem } from "@/types" // 🎯 確保維持中心型別引入
import { formatFantasyDate, CalendarConfig } from "@/lib/calendarEngine" 
import { useState, useEffect } from "react" 

interface EventFormProps {
  item: SettingItem;
  calendarConfig?: CalendarConfig; 
  allSettings: { category: string; items: SettingItem[] }[]; // 確保介面完全咬合
  onSave: (updatedItem: SettingItem) => void | Promise<void>; 
  onDirty?: () => void; 
}

// 🌟 修正點 1：確實把大腦傳進來的 allSettings 從解構參數中解放出來！
export default function EventForm({ item, calendarConfig, allSettings, onSave, onDirty }: EventFormProps) {
  const [name, setName] = useState(item.name || "");
  const [currentDate, setCurrentDate] = useState(item.date || "");
  const [locationId, setLocationId] = useState(item.locationId || "");
  const [description, setDescription] = useState(item.description || "");
  const [saveStatus, setSaveStatus] = useState("儲存事件紀錄");
  const [relations, setRelations] = useState<{targetId: string, type: string}[]>(item.relations || []);

  const [selectedEra, setSelectedEra] = useState("");
  const [fantasyYear, setFantasyYear] = useState<number | "">("");

  const isStandardMode = calendarConfig?.mode !== "fantasy_only";
  
  // 🌟 修正點 2：確實將變數定義收攏在函數體內，並補上明確型別防禦
  const availableLocations = allSettings?.find((c: any) => {
    const currentCategory = (c.category || c.categoryName || c.name || "").toLowerCase();
    return currentCategory.includes("location") || currentCategory.includes("地點") || currentCategory === "place";
  })?.items || [];

  const availableCharacters = allSettings?.find((c: any) => {
    const currentCategory = (c.category || c.categoryName || c.name || "").toLowerCase();
    return currentCategory.includes("character") || currentCategory.includes("character") || currentCategory.includes("人物") || currentCategory.includes("角色");
  })?.items || [];

  useEffect(() => {
    setName(item.name || "");
    setCurrentDate(item.date || "");
    setLocationId(item.locationId || "");
    setDescription(item.description || "");
    setRelations(item.relations || []);

    if (!isStandardMode) {
      const displayStr = item.fantasyDisplay || "";
      const matched = displayStr.match(/^(.+?)\s*(\d+)\s*年$/);
      
      if (matched) {
        setSelectedEra(matched[1]);
        setFantasyYear(parseInt(matched[2], 10));
      } else {
        const firstEraName = calendarConfig?.eras?.[0]?.name || "";
        setSelectedEra(firstEraName);
        setFantasyYear(1);
      }
    }
  }, [item, calendarConfig, isStandardMode]);

  const generatedFantasyDisplay = selectedEra && fantasyYear !== "" ? `${selectedEra} ${fantasyYear} 年` : "";
  const displayDate = isStandardMode 
    ? formatFantasyDate(currentDate, calendarConfig, "")
    : generatedFantasyDisplay;

  const handleCharacterToggle = (characterName: string) => {
    onDirty?.();
    const exists = relations.some(r => r.targetId === characterName);
    if (exists) {
      setRelations(relations.filter(r => r.targetId !== characterName));
    } else {
      setRelations([...relations, { targetId: characterName, type: '登場' }]);
    }
  };

  const handleSaveClick = async () => {
    let calculatedWeight = item.sortWeight ?? 0;

    if (!isStandardMode && calendarConfig?.eras) {
      const eraIndex = calendarConfig.eras.findIndex(e => e.name === selectedEra);
      const safeIndex = eraIndex !== -1 ? eraIndex : 0;
      const safeYear = fantasyYear !== "" ? fantasyYear : 1;
      calculatedWeight = safeIndex * 100000 + safeYear;
    }

    const updatedItem: SettingItem = {
      ...item,
      name,
      locationId,
      description,
      relations,
      date: isStandardMode ? currentDate : "", 
      fantasyDisplay: isStandardMode ? "" : generatedFantasyDisplay, 
      sortWeight: calculatedWeight 
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
        <div className="p-4 rounded-lg bg-slate-900 text-white shadow-inner flex flex-col gap-1 transition-colors">
          <span className="text-slate-400 text-xs">
            {isStandardMode ? "引擎自動換算日期" : "世界觀曆法時序對齊預覽"}
          </span>
          <span className="text-xl font-bold tracking-wider text-emerald-400">
            {displayDate || (isStandardMode ? "請選擇標準時間..." : "請選擇自訂紀元時序...")}
          </span>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="name">事件名稱</Label>
          <Input id="name" value={name} onChange={(e) => { setName(e.target.value); onDirty?.(); }} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="grid gap-2 col-span-2">
                <Label htmlFor="eraSelect">選擇歷史紀元時期</Label>
                <select
                  id="eraSelect"
                  value={selectedEra}
                  onChange={(e) => { setSelectedEra(e.target.value); onDirty?.(); }}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer text-slate-800"
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
            <select
              id="location"
              value={locationId}
              onChange={(e) => { setLocationId(e.target.value); onDirty?.(); }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer text-slate-800"
          >
            <option value="">-- 請選取專案中的地點 --</option>
            {availableLocations.map((loc: SettingItem) => (
              <option key={loc.id} value={loc.id}> {/* 🎯 傳入真正的 loc.id */}
                📍 {loc.name} {loc.climate ? `(${loc.climate})` : ''}
              </option>
            ))}
          </select>
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

        <div className="grid gap-2">
          <Label className="font-bold text-slate-700">牽涉對象 (勾選以綁定專案人物)</Label>
          <div className="flex flex-wrap gap-2 p-4 rounded-xl border border-slate-200 bg-slate-50 min-h-[80px]">
            {availableCharacters.length > 0 ? (
              availableCharacters.map((char: SettingItem) => {
                const isSelected = relations.some(r => r.targetId === char.name);
                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => handleCharacterToggle(char.name || "")}
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