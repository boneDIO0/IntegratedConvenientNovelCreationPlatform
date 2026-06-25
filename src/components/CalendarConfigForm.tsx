"use client";

import { useState, useEffect } from "react";
import { CalendarConfig } from "@/lib/calendarEngine";

interface CalendarConfigFormProps {
  projectId: string;
  initialConfig?: CalendarConfig;
  onSaveSuccess: () => void;
  onDirty?: () => void; // 🌟 核心新增：接收全域髒數據監聽通知
}

export default function CalendarConfigForm({ projectId, initialConfig, onSaveSuccess, onDirty }: CalendarConfigFormProps) {
  const [eraName, setEraName] = useState("廢墟紀元");
  const [baseYear, setBaseYear] = useState(2000);
  const [months, setMonths] = useState<{ name: string; days: number }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // 預設的 12 游牧月份，用作空值保護 Fallback 底座
  const DEFAULT_12_MONTHS = [
    { name: "初雪之月", days: 30 }, { name: "寒風之月", days: 30 },
    { name: "甦醒之月", days: 30 }, { name: "雷雨之月", days: 30 },
    { name: "長草之月", days: 30 }, { name: "烈陽之月", days: 30 },
    { name: "旱風之月", days: 30 }, { name: "金葉之月", days: 30 },
    { name: "收穫之月", days: 30 }, { name: "枯木之月", days: 30 },
    { name: "冰霜之月", days: 30 }, { name: "長夜之月", days: 30 }
  ];

  // 🌟 核心修正 1：非同步同步狀態時，強制落實空值與壞軌防禦
  useEffect(() => {
    if (initialConfig && Object.keys(initialConfig).length > 0) {
      setEraName(initialConfig.eraName || "廢墟紀元");
      setBaseYear(initialConfig.baseYear !== undefined ? initialConfig.baseYear : 2000);
      if (initialConfig.months && initialConfig.months.length > 0) {
        setMonths(initialConfig.months);
      } else {
        setMonths(DEFAULT_12_MONTHS);
      }
    } else {
      // 如果資料庫完全沒資料，自動初始化 12 個預設月份給寫手引導
      setMonths(DEFAULT_12_MONTHS);
    }
  }, [initialConfig]);

  const handleAddMonth = () => {
    onDirty?.(); // 觸發未儲存防呆
    setMonths([...months, { name: `新月份-${months.length + 1}`, days: 30 }]);
  };

  const handleRemoveMonth = (index: number) => {
    onDirty?.();
    setMonths(months.filter((_, i) => i !== index));
  };

  const handleMonthChange = (index: number, field: "name" | "days", value: any) => {
    onDirty?.();
    const updated = [...months];
    updated[index] = { ...updated[index], [field]: value };
    setMonths(updated);
  };

  const handleSave = async () => {
    // 🌟 核心修正 2：業務邏輯層防呆校驗
    if (!eraName.trim()) {
      alert("⚠️ 儲存失敗：世界觀紀元名稱不可為空！");
      return;
    }

    if (months.length !== 12) {
      alert(`⚠️ 曆法限制錯誤：為配合全域標準時間軸轉換，自定義月份總數必須精準為 12 個（目前配置了 ${months.length} 個）。`);
      return;
    }

    try {
      setIsSaving(true);
      const payload: CalendarConfig = { eraName, baseYear, months };
      
      const res = await fetch(`/api/projects/${projectId}/calendar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("儲存曆法失敗");
      alert("🎉 世界觀自定義曆法規則更新成功！");
      onSaveSuccess(); 
    } catch (error) {
      console.error(error);
      alert("⚠️ 儲存失敗，請檢查資料庫連線狀態。");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-xl font-bold text-slate-800">🌍 修改世界觀專屬曆法</h3>
        <p className="text-sm text-slate-500">自定義屬於你小說世界的時間換算規則，設定後將即時應用於歷史事件中。</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">紀元名稱 / 核心年號</label>
          <input
            type="text"
            value={eraName}
            onChange={(e) => { setEraName(e.target.value); onDirty?.(); }}
            placeholder="例如：廢墟紀元、星海曆"
            className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">西元元年對應年份 (Base Year)</label>
          <input
            type="number"
            value={baseYear}
            onChange={(e) => { setBaseYear(parseInt(e.target.value) || 0); onDirty?.(); }}
            className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-slate-700">自定義月份與天數配置</label>
            {/* 提示小標籤 */}
            <span className={`text-xs px-2 py-0.5 rounded font-bold ${months.length === 12 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {months.length} / 12 月
            </span>
          </div>
          <button
            type="button"
            onClick={handleAddMonth}
            className="text-xs font-bold text-blue-600 hover:text-blue-700"
          >
            ➕ 新增月份
          </button>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-100 rounded-lg p-3 bg-slate-50/50">
          {months.map((month, index) => (
            <div key={index} className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 w-8"># {index + 1}</span>
              <input
                type="text"
                value={month.name}
                onChange={(e) => handleMonthChange(index, "name", e.target.value)}
                placeholder="月份稱謂 (如: 霜降之月)"
                className="flex-1 rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <input
                type="number"
                value={month.days}
                onChange={(e) => handleMonthChange(index, "days", parseInt(e.target.value) || 30)}
                placeholder="天數"
                className="w-20 rounded border border-slate-200 p-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <button
                type="button"
                onClick={() => handleRemoveMonth(index)}
                className="text-red-500 hover:text-red-600 p-1 text-xs"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
        >
          {isSaving ? "正在儲存變更..." : "💾 儲存曆法規則"}
        </button>
      </div>
    </div>
  );
}