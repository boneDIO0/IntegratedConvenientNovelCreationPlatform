"use client";

import { useState, useEffect } from "react";
import { CalendarConfig, EraDefinition } from "@/lib/calendarEngine";
import { Plus, Trash2, CalendarDays, HelpCircle } from "lucide-react"; // 導入必要圖示

interface CalendarConfigFormProps {
  projectId: string;
  initialConfig?: CalendarConfig;
  onSaveSuccess: () => void;
  onDirty?: () => void;
}

export default function CalendarConfigForm({ projectId, initialConfig, onSaveSuccess, onDirty }: CalendarConfigFormProps) {
  // 🌟 1. 宣告符合多紀元架構的 eras 陣列狀態
  const [eras, setEras] = useState<EraDefinition[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // 預設的 12 游牧月份作為建置底座
  const DEFAULT_12_MONTHS = [
    { name: "初雪之月", days: 30 }, { name: "寒風之月", days: 30 },
    { name: "甦醒之月", days: 30 }, { name: "雷雨之月", days: 30 },
    { name: "長草之月", days: 30 }, { name: "烈陽之月", days: 30 },
    { name: "旱風之月", days: 30 }, { name: "金葉之月", days: 30 },
    { name: "收穫之月", days: 30 }, { name: "枯木之月", days: 30 },
    { name: "冰霜之月", days: 30 }, { name: "長夜之月", days: 30 }
  ];

  // 預設的多紀元 fallback 引導範本
  const DEFAULT_ERAS_TEMPLATE: EraDefinition[] = [
    {
      name: "新紀元",
      startYear: 2046,
      endYear: null,
      isRetrograde: false,
      months: DEFAULT_12_MONTHS
    }
  ];

  // 🌟 2. 非同步同步狀態：落實多紀元空值安全防禦
  useEffect(() => {
    if (initialConfig && initialConfig.eras && initialConfig.eras.length > 0) {
      setEras(initialConfig.eras);
    } else {
      setEras(DEFAULT_ERAS_TEMPLATE);
    }
  }, [initialConfig]);

  // 新增一個歷史時期區間
  const handleAddEra = () => {
    onDirty?.();
    const lastEra = eras[eras.length - 1];
    const nextStart = lastEra ? (lastEra.endYear !== null ? lastEra.endYear + 1 : 2050) : 2000;
    
    setEras([...eras, {
      name: `未命名新紀元-${eras.length + 1}`,
      startYear: nextStart,
      endYear: null,
      isRetrograde: false,
      months: DEFAULT_12_MONTHS
    }]);
  };

  const handleRemoveEra = (eraIndex: number) => {
    onDirty?.();
    setEras(eras.filter((_, i) => i !== eraIndex));
  };

  const handleEraFieldChange = (eraIndex: number, field: keyof EraDefinition, value: any) => {
    onDirty?.();
    const updated = [...eras];
    updated[eraIndex] = { ...updated[eraIndex], [field]: value };
    setEras(updated);
  };

  const handleMonthChange = (eraIndex: number, monthIndex: number, field: "name" | "days", value: any) => {
    onDirty?.();
    const updated = [...eras];
    const updatedMonths = [...updated[eraIndex].months];
    updatedMonths[monthIndex] = { ...updatedMonths[monthIndex], [field]: value };
    updated[eraIndex].months = updatedMonths;
    setEras(updated);
  };

  // 🌟 3. 多紀元嚴密業務邏輯校驗
  const handleSave = async () => {
    if (eras.length === 0) {
      alert("⚠️ 儲存失敗：系統至少需包含一個歷史紀元時期。");
      return;
    }

    for (let i = 0; i < eras.length; i++) {
      const era = eras[i];
      if (!era.name.trim()) {
        alert(`⚠️ 儲存失敗：第 ${i + 1} 個時期的紀元名稱不可為空！`);
        return;
      }
      if (era.months.length !== 12) {
        alert(`⚠️ 曆法限制錯誤：「${era.name}」的自定義月份總數必須精準為 12 個（目前配置了 ${era.months.length} 個）。`);
        return;
      }
      if (era.endYear !== null && era.startYear > era.endYear) {
        alert(`⚠️ 時間邏輯衝突：「${era.name}」的起始年份 (${era.startYear}) 不可大於結束年份 (${era.endYear})。`);
        return;
      }
    }

    try {
      setIsSaving(true);
      const payload: CalendarConfig = { eras }; // 完美對齊多紀元 Payload
      
      const res = await fetch(`/api/projects/${projectId}/calendar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("儲存曆法失敗");
      alert("🎉 世界觀多紀元斷代曆法規則更新成功！");
      onSaveSuccess(); 
    } catch (error) {
      console.error(error);
      alert("⚠️ 儲存失敗，請檢查資料庫連線狀態。");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-800">🌍 修改世界觀多紀元斷代曆法</h3>
          <p className="text-sm text-slate-500 mt-1">
            設定多個歷史時期區間與專屬月份。系統將根據歷史事件的西元年份，自動套用對應的虛擬曆法。
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddEra}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-lg transition-colors shadow-sm border border-blue-200"
        >
          <Plus size={14} /> 新增歷史時期
        </button>
      </div>

      {/* 雙重迴圈渲染：歷史時期卡片 */}
      <div className="space-y-6">
        {eras.map((era, eraIdx) => (
          <div key={eraIdx} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 relative group/era">
            
            {/* 右上角刪除時期按鈕 */}
            <button
              type="button"
              onClick={() => handleRemoveEra(eraIdx)}
              className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover/era:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-slate-50"
              title="刪除此時期"
            >
              <Trash2 size={16} />
            </button>

            <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-100 pb-2">
              <CalendarDays size={18} className="text-blue-500" />
              <span>時期 #0{eraIdx + 1} 設定</span>
            </div>

            {/* 時期核心參數配置 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">紀元名稱 / 年號</label>
                <input
                  type="text"
                  value={era.name}
                  onChange={(e) => handleEraFieldChange(eraIdx, "name", e.target.value)}
                  placeholder="例如：廢墟紀元、星海曆"
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">西元起始年 (包含)</label>
                <input
                  type="number"
                  value={(era.startYear === -Infinity || era.startYear === null || era.startYear === undefined) ? "" : era.startYear}
                  onChange={(e) => handleEraFieldChange(eraIdx, "startYear", e.target.value ? parseInt(e.target.value) : -Infinity)}
                  placeholder="如: 2046"
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">西元結束年 (選填)</label>
                <input
                  type="number"
                  value={(era.endYear === null || era.endYear === undefined) ? "" : era.endYear}
                  onChange={(e) => handleEraFieldChange(eraIdx, "endYear", e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="留空代表持續至今"
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="flex items-center gap-2 pt-6 pl-2">
                <input
                  type="checkbox"
                  id={`retrograde-${eraIdx}`}
                  checked={!!era.isRetrograde}
                  onChange={(e) => handleEraFieldChange(eraIdx, "isRetrograde", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor={`retrograde-${eraIdx}`} className="text-xs font-semibold text-slate-600 cursor-pointer flex items-center gap-1">
                  歷史逆向倒推 
                  <span title="開啟後，年份數字將隨著西元越古老而變得越大（例如西元前、大災變前舊曆）" className="inline-flex items-center">
                    <HelpCircle size={12} className="text-slate-400" />
                  </span>
                </label>
              </div>
            </div>

            {/* 該時期專屬之 12 月份內迴圈渲染 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>該時期專屬月份與天數配置</span>
                <span className={`px-2 py-0.5 rounded font-bold ${era.months.length === 12 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {era.months.length} / 12 月
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-slate-100 rounded-lg p-3 bg-slate-50/50">
                {era.months.map((month, monthIdx) => (
                  <div key={monthIdx} className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm text-xs">
                    <span className="font-bold text-slate-400 w-6 text-center">#{monthIdx + 1}</span>
                    <input
                      type="text"
                      value={month.name}
                      onChange={(e) => handleMonthChange(eraIdx, monthIdx, "name", e.target.value)}
                      placeholder="稱謂 (如: 烈陽之月)"
                      className="flex-1 rounded border border-slate-200 p-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <input
                      type="number"
                      value={month.days}
                      onChange={(e) => handleMonthChange(eraIdx, monthIdx, "days", parseInt(e.target.value) || 30)}
                      placeholder="天數"
                      className="w-14 rounded border border-slate-200 p-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                ))}
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* 儲存按鈕 */}
      <div className="flex justify-end pt-4 border-t border-slate-100">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
        >
          {isSaving ? "正在儲存變更..." : "💾 儲存多紀元曆法規則"}
        </button>
      </div>
    </div>
  );
}