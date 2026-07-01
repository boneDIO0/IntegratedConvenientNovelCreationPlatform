'use client'

import { useMemo, useState, useEffect } from "react";
import { SettingItem } from "@/lib/mockSettings";
import { CalendarConfig, formatFantasyDate } from "@/lib/calendarEngine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// 🌟 核心新增：引入控制切換的 UI 元件
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface TimelineViewProps {
  allSettings: { category: string; items: SettingItem[] }[]; 
  calendarConfig?: CalendarConfig;
  filterTargetId?: string; // 當前正在編輯/選取的事件項目 ID
  onEventClick?: (ids: string[]) => void;
}

export default function TimelineView({ allSettings, calendarConfig, filterTargetId, onEventClick }: TimelineViewProps) {
  
  // 🌟 核心狀態：是否開啟「檢視全域完整歷史」
  // 如果是從設定集直接點進來（filterTargetId 為空），預設看全部 (true)；如果是從特定事件點進來，預設只看該支線 (false)
  const [showAll, setShowAll] = useState<boolean>(!filterTargetId);

  // 防呆：當使用者在左側目錄切換不同事件項目時，自動重置開關狀態
  useEffect(() => {
    if (filterTargetId) {
      setShowAll(false);
    } else {
      setShowAll(true);
    }
  }, [filterTargetId]);

  // 檢查當前曆法全域模式是否為標準自動換算
  const isStandardMode = calendarConfig?.mode !== "fantasy_only";

  // 抓取、過濾並排序歷史事件
  const sortedEvents = useMemo(() => {
    const eventGroup = allSettings.find(
      (g) => g.category === "歷史事件 (Events)" || g.category === "歷史事件" || g.category === "event"
    );
    let events = (eventGroup?.items || []) as SettingItem[];
    
    // 🌟 核心過濾改動：依據 showAll 開關狀態與 filterTargetId 動態決定資料流
    if (filterTargetId && !showAll) {
      events = events.filter(event => 
        event.id === filterTargetId || 
        event.relations?.some(rel => rel.targetId === filterTargetId)
      );
    }
    
    return [...events].sort((a, b) => {
      if (isStandardMode) {
        return (a.date || "").localeCompare(b.date || "");
      } else {
        const weightA = a.sortWeight ?? 0;
        const weightB = b.sortWeight ?? 0;
        return weightA - weightB;
      }
    });
  }, [allSettings, filterTargetId, showAll, isStandardMode]); 

  return (
    <div className="w-full max-w-3xl mx-auto py-6 px-4 h-full flex flex-col">
      
      {/* 🛠️ 頂部工具控制列 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-wider">
            世界觀歷史紀事
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {filterTargetId ? "正在進行關聯時序透視" : "全域編年史視圖"}
          </p>
        </div>

        {/* 🌟 核心功能切換：只有當使用者是從特定事件點進來時，才渲染這個彈性切換鈕 */}
        {filterTargetId && (
          <div className="flex items-center space-x-2 bg-slate-950 text-white px-4 py-2 rounded-xl shadow-sm border border-slate-800 transition-all">
            <Switch 
              id="timeline-filter-toggle" 
              checked={showAll} 
              onCheckedChange={setShowAll} 
              className="data-[state=checked]:bg-emerald-500 cursor-pointer"
            />
            <Label htmlFor="timeline-filter-toggle" className="text-xs font-semibold tracking-wide cursor-pointer select-none text-slate-300">
              {showAll ? "🌐 檢視完整世界時間軸" : "📌 僅鎖定此事件關聯時序"}
            </Label>
          </div>
        )}
      </div>

      {/* 📅 時間軸主體滾動區域 */}
      <div className="flex-1 overflow-y-auto pr-1">
        {sortedEvents.length === 0 ? (
          // 🌟 修正點：將空資料狀態下移至此處渲染，保證上方的工具列永遠不會因為 Early Return 被熔斷！
          <div className="flex flex-col items-center justify-center text-slate-400 gap-3 py-16 bg-white rounded-xl border border-dashed border-slate-200">
            <span className="text-4xl">⏳</span>
            <p className="text-sm font-medium">目前此區間內暫無歷史事件紀錄。</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-200 ml-4 md:ml-6 space-y-12 pb-12">
            {sortedEvents.map((event) => {
              const fantasyDate = formatFantasyDate(event.date, calendarConfig, event.fantasyDisplay);
              
              // 🌟 核心高亮判定：這片卡片是不是寫手正在左側編輯的那個核心節點？
              const isCurrentActiveEvent = event.id === filterTargetId;

              return (
                <div key={event.id} className="relative pl-8 md:pl-10 group">
                  {/* 圓形節點動態色調 */}
                  <div className={`absolute -left-[11px] top-1.5 h-5 w-5 rounded-full border-4 border-white shadow-sm group-hover:scale-110 transition-transform ${isCurrentActiveEvent ? 'bg-amber-500 animate-pulse ring-4 ring-amber-100' : 'bg-emerald-500'}`} />
                  
                  {/* 內容卡片：如果是當前事件，刷上高質感的金黃色定錨框線與背景發光 */}
                  <div className={`bg-white p-6 rounded-xl border transition-all ${isCurrentActiveEvent ? 'border-amber-400 shadow-md ring-2 ring-amber-50 bg-amber-50/10' : 'border-slate-200/80 shadow-sm hover:border-blue-400 hover:shadow-md'}`}>
                    
                    {/* 頂部：轉換後的世界觀時間 & 標籤 */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border shadow-sm ${isCurrentActiveEvent ? 'text-amber-800 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200/60'}`}>
                        ⏳ {fantasyDate || (isStandardMode ? "未設定標準日期" : "未設定自訂時間")}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isCurrentActiveEvent && (
                          <Badge className="bg-amber-500 hover:bg-amber-600 font-bold text-xs shadow-sm">
                            📌 當前編輯項目
                          </Badge>
                        )}
                        {event.location && (
                          <Badge variant="secondary" className="text-slate-500 font-medium bg-slate-100 border border-slate-200/40">
                            📍 {event.location}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* 標題與內文 */}
                    <h3 className={`text-xl font-bold mb-2 transition-colors ${isCurrentActiveEvent ? 'text-amber-900' : 'text-slate-800 group-hover:text-blue-600'}`}>
                      {event.name || "未命名事件"}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                      {event.description || "暫無事件詳細描述。"}
                    </p>

                    {/* 關聯徽章與圖譜聯動區 */}
                    {event.relations && event.relations.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className="text-xs text-slate-400 font-medium">牽涉對象：</span>
                          {event.relations.map((rel, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs font-normal text-slate-600 bg-slate-50">
                              {rel.targetId} ({rel.type})
                            </Badge>
                          ))}
                        </div>
                        
                        <Button 
                          variant="secondary" 
                          size="sm"
                          className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 shadow-sm self-end sm:self-auto"
                          onClick={() => {
                            if (onEventClick) {
                              const involvedIds = [event.id, ...event.relations!.map(r => r.targetId)];
                              onEventClick(involvedIds);
                            }
                          }}
                        >
                          🗺️ 在圖譜中查看
                        </Button>
                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}