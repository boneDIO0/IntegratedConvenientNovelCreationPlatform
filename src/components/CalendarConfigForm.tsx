"use client";

import { useState, useEffect } from "react";
import { CalendarConfig, EraDefinition } from "@/types"; 
import { Plus, Trash2, CalendarDays, HelpCircle, Layers, ToggleLeft, ArrowUpDown } from "lucide-react"; 
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import SortableEraItem from "./SortableEraItem"; 
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CalendarConfigFormProps {
  projectId: string;
  initialConfig?: CalendarConfig;
  // 🌟 修正 1：完美對齊父層，允許將最新快照當作參數回傳，徹底封殺 fetch 競爭
  onSaveSuccess: (latestConfig?: CalendarConfig) => void;
  onDirty?: () => void;
}

export default function CalendarConfigForm({ projectId, initialConfig, onSaveSuccess, onDirty }: CalendarConfigFormProps) {
  const [mode, setMode] = useState<'standard' | 'fantasy_only'>('standard');
  const [eras, setEras] = useState<EraDefinition[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const DEFAULT_12_MONTHS = [
    { name: "初雪之月", days: 30 }, { name: "寒風之月", days: 30 },
    { name: "甦醒之月", days: 30 }, { name: "雷雨之月", days: 30 },
    { name: "長草之月", days: 30 }, { name: "烈陽之月", days: 30 },
    { name: "旱風之月", days: 30 }, { name: "金葉之月", days: 30 },
    { name: "收穫之月", days: 30 }, { name: "枯木之月", days: 30 },
    { name: "冰霜之月", days: 30 }, { name: "長夜之月", days: 30 }
  ];

  const DEFAULT_ERAS_TEMPLATE: EraDefinition[] = [
    {
      id: "era-init-0",
      name: "新紀元",
      startYear: 2026,
      endYear: null,
      isRetrograde: false,
      months: DEFAULT_12_MONTHS
    }
  ];

  useEffect(() => {
    if (initialConfig && Object.keys(initialConfig).length > 0) {
      setMode(initialConfig.mode || 'standard');
      if (initialConfig.eras && initialConfig.eras.length > 0) {
        const erasWithId = initialConfig.eras.map((era, idx) => ({
          ...era,
          id: era.id || `era-${idx}-${Date.now()}`
        }));
        setEras(erasWithId);
      } else {
        setEras(DEFAULT_ERAS_TEMPLATE);
      }
    } else {
      setMode('standard');
      setEras(DEFAULT_ERAS_TEMPLATE);
    }
  }, [initialConfig]);

  // 🌟 修正 2：處理拖曳結束事件
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onDirty?.();
      
      let updatedEras: EraDefinition[] = [];
      
      // 先同步更新本地的 React 狀態，確保畫面流暢不閃爍
      const oldIndex = eras.findIndex((item) => item.id === active.id);
      const newIndex = eras.findIndex((item) => item.id === over.id);
      updatedEras = arrayMove(eras, oldIndex, newIndex);
      setEras(updatedEras);

      // 🌟 關鍵修正：不再打單獨的 /mode 路由，直接將最新完全體快照同步給主 API 與父層！
      if (updatedEras.length > 0) {
        const nextPayload: CalendarConfig = { mode, eras: updatedEras };
        await saveCalendarConfigDirectly(nextPayload);
      }
    }
  };

  // 🌟 核心提取：合併為單一強大且穩定的儲存管道，避免雲端分布式調用出錯
  const saveCalendarConfigDirectly = async (payload: CalendarConfig) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/calendar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("同步曆法失敗");
      
      // 🌟 核心突破：直接把當前最正確的完全體傳給父層，父層收到後直接 set 鎖死，拒絕重新 load 舊快取！
      onSaveSuccess(payload); 
    } catch (err) {
      console.error("曆法即時同步出錯:", err);
    }
  };

  const handleAddEra = () => {
    onDirty?.();
    const lastEra = eras[eras.length - 1];
    const nextStart = lastEra ? (lastEra.endYear ? lastEra.endYear + 1 : 2050) : 2000;
    
    setEras([...eras, {
      id: `era-new-${Date.now()}`, 
      name: `未命名新紀元-${eras.length + 1}`,
      startYear: nextStart,
      endYear: null,
      isRetrograde: false,
      months: DEFAULT_12_MONTHS
    }]);
  };

  const handleRemoveEra = (eraId: string) => {
    onDirty?.();
    setEras(eras.filter((e) => e.id !== eraId));
  };

  const handleSortableUpdate = (id: string, updatedFields: any) => {
    onDirty?.();
    setEras(eras.map((e) => e.id === id ? { ...e, ...updatedFields } : e));
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
      if (mode === 'standard' && era.endYear && era.startYear && era.startYear > era.endYear) {
        alert(`⚠️ 時間邏輯衝突：「${era.name}」的起始年份 (${era.startYear}) 不可大於結束年份 (${era.endYear})。`);
        return;
      }
    }

    try {
      setIsSaving(true);
      const payload: CalendarConfig = { mode, eras }; 
      await saveCalendarConfigDirectly(payload);
      alert("🎉 世界觀多紀元雙軌制曆法規則更新成功！");
    } catch (error) {
      alert("⚠️ 儲存失敗，請檢查資料庫連線狀態。");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 標頭標籤 */}
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-xl font-bold text-slate-800">🌍 修改世界觀多紀元斷代曆法</h3>
        <p className="text-sm text-slate-500 mt-1">
          設定多個歷史時期區間。系統將根據你排定的優先順序或西元年份，自動編排小說事件流。
        </p>
      </div>

      {/* 雙軌制模式控制元件 */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-inner space-y-3">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
          <ToggleLeft size={18} className="text-emerald-500" />
          <span>⏱️ 曆法運行模式切換</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 pt-1">
          <label className={`flex-1 flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer bg-white ${mode === 'standard' ? 'border-emerald-500 ring-2 ring-emerald-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
            <input 
              type="radio" 
              name="calendarMode" 
              checked={mode === 'standard'} 
              onChange={async () => { 
                setMode('standard'); 
                onDirty?.(); 
                await saveCalendarConfigDirectly({ mode: 'standard', eras });
              }}
              className="mt-0.5 h-4 w-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-800 block">🌐 標準時間軸自動換算</span>
              <span className="text-[11px] text-slate-400 block leading-normal">寫作時輸入標準西元日期，系統將代入斷代天數公式自動反解。</span>
            </div>
          </label>

          <label className={`flex-1 flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer bg-white ${mode === 'fantasy_only' ? 'border-emerald-500 ring-2 ring-emerald-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
            <input 
              type="radio" 
              name="calendarMode" 
              checked={mode === 'fantasy_only'} 
              onChange={async () => { 
                setMode('fantasy_only'); 
                onDirty?.(); 
                await saveCalendarConfigDirectly({ mode: 'fantasy_only', eras });
              }} 
              className="mt-0.5 h-4 w-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-800 block">⚙️ 純自訂紀元文字（🌟 支援拖曳排序）</span>
              <span className="text-[11px] text-slate-400 block leading-normal">解除西元綁定。透過「上下拖曳」直接排定歷史時期的先後順序，輕量化管理。</span>
            </div>
          </label>
        </div>
      </div>

      {/* 頂層時期控制列 */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
          {mode === 'fantasy_only' ? <ArrowUpDown size={14} className="text-blue-500 animate-pulse" /> : <Layers size={14} />}
          <span>
            {mode === 'fantasy_only' ? "拖曳排定歷史紀元（越上方越古老）" : `歷史斷代切片（共 ${eras.length} 個時期）`}
          </span>
        </div>
        <button
          type="button"
          onClick={handleAddEra}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-lg transition-colors shadow-sm border border-blue-200"
        >
          <Plus size={14} /> 新增歷史時期
        </button>
      </div>

      {/* 雙軌制分流渲染畫布區 */}
      {mode === 'fantasy_only' ? (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="space-y-3">
            <SortableContext items={eras.map((e) => e.id)} strategy={verticalListSortingStrategy}>
              {eras.map((era, index) => (
                <SortableEraItem
                  key={era.id}
                  era={era as any}
                  index={index}
                  onUpdate={handleSortableUpdate}
                  onRemove={handleRemoveEra}
                />
              ))}
            </SortableContext>
          </div>
        </DndContext>
      ) : (
        <div className="space-y-6">
          {eras.map((era, eraIdx) => (
            <div key={era.id || eraIdx} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 relative group/era">
              <div className="absolute top-4 right-4 opacity-0 group-hover/era:opacity-100 transition-opacity">
                <DeleteEraConfirm 
                  eraName={era.name} 
                  onConfirm={() => handleRemoveEra(era.id)} 
                />
              </div>

              <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-100 pb-2">
                <CalendarDays size={18} className="text-blue-500" />
                <span>時期 #0{eraIdx + 1} 物理參數配置</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">紀元名稱 / 年號</label>
                  <input
                    type="text"
                    value={era.name}
                    onChange={(e) => handleEraFieldChange(eraIdx, "name", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">西元起始年</label>
                  <input
                    type="number"
                    value={(era.startYear === -Infinity || era.startYear === null || era.startYear === undefined) ? "" : era.startYear}
                    onChange={(e) => handleEraFieldChange(eraIdx, "startYear", e.target.value ? parseInt(e.target.value, 10) : null)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">西元結束年</label>
                  <input
                    type="number"
                    value={(era.endYear === null || era.endYear === undefined) ? "" : era.endYear}
                    onChange={(e) => handleEraFieldChange(eraIdx, "endYear", e.target.value ? parseInt(e.target.value, 10) : null)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6 pl-2">
                  <input
                    type="checkbox"
                    id={`retrograde-${era.id || eraIdx}`}
                    checked={!!era.isRetrograde}
                    onChange={(e) => handleEraFieldChange(eraIdx, "isRetrograde", e.target.checked)}
                    className="h-4 w-4 rounded text-blue-600 cursor-pointer"
                  />
                  <label htmlFor={`retrograde-${era.id || eraIdx}`} className="text-xs font-semibold text-slate-600 cursor-pointer flex items-center gap-1">
                    歷史逆向倒推 
                    <HelpCircle size={12} className="text-slate-400" />
                  </label>
                </div>
              </div>

              {/* 月份與天數迴圈 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>該時期專屬月份與天數配置</span>
                  <span className="px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700">12 月份制</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-slate-100 rounded-lg p-3 bg-slate-50/50">
                  {era.months?.map((month, monthIdx) => (
                    <div key={monthIdx} className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200 text-xs">
                      <span className="font-bold text-slate-400 w-6 text-center">#{monthIdx + 1}</span>
                      <input
                        type="text"
                        value={month.name}
                        onChange={(e) => handleMonthChange(eraIdx, monthIdx, "name", e.target.value)}
                        className="flex-1 rounded border border-slate-200 p-1 text-xs"
                      />
                      <input
                        type="number"
                        value={month.days}
                        onChange={(e) => handleMonthChange(eraIdx, monthIdx, "days", parseInt(e.target.value, 10) || 30)}
                        className="w-14 rounded border border-slate-200 p-1 text-xs text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 底部儲存列 */}
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

function DeleteEraConfirm({ eraName, onConfirm }: { eraName: string; onConfirm: () => void }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg h-auto"
          title="刪除此時期"
        >
          <Trash2 size={16} />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            ⚠️ 確定要刪除該歷史時期嗎？
          </DialogTitle>
          <DialogDescription className="pt-2 leading-relaxed text-slate-600">
            您即將刪除「<span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">{eraName}</span>」。
            刪除後，所有綁定在此時序區間內的奇幻歷史事件將會失去平閏年反解依據。此操作無法復原。
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="gap-2 mt-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">取消</Button>
          </DialogClose>
          <Button 
            type="button" 
            className="bg-red-600 hover:bg-red-700 text-white font-medium"
            onClick={onConfirm}
          >
            確認強行刪除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}