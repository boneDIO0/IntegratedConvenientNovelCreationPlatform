'use client'

import { useMemo } from "react";
import { SettingItem } from "@/lib/mockSettings";
// 🌟 核心修正：引入全域 CalendarConfig 型別定義與更新後的轉換引擎
import { CalendarConfig, formatFantasyDate } from "@/lib/calendarEngine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TimelineViewProps {
  allSettings: { category: string; items: SettingItem[] }[]; 
  calendarConfig?: CalendarConfig;
  filterTargetId?: string; 
  onEventClick?: (ids: string[]) => void;
}

export default function TimelineView({ allSettings, calendarConfig, filterTargetId, onEventClick }: TimelineViewProps) {
  
  // 檢查當前曆法全域模式是否為標準自動換算
  const isStandardMode = calendarConfig?.mode !== "fantasy_only";

  // 抓取、過濾並排序歷史事件
  const sortedEvents = useMemo(() => {
    const eventGroup = allSettings.find(
      (g) => g.category === "歷史事件 (Events)" || g.category === "歷史事件" || g.category === "event"
    );
    let events = (eventGroup?.items || []) as SettingItem[];
    
    if (filterTargetId) {
      events = events.filter(event => 
        event.id === filterTargetId || 
        event.relations?.some(rel => rel.targetId === filterTargetId)
      );
    }
    
    // 🌟 核心優化：依據雙軌制模式動態分流排序
    return [...events].sort((a, b) => {
      if (isStandardMode) {
        // 🌐 軌道 A：標準時間模式下，依據標準 ISO 時間戳由古至今進行物理排序
        return (a.date || "").localeCompare(b.date || "");
      } else {
        // ✍️ 軌道 B：純紀元手動模式下，優先使用自訂排序權重 (sortWeight) 排序，避免文字無法定錨
        const weightA = a.sortWeight ?? 0;
        const weightB = b.sortWeight ?? 0;
        return weightA - weightB;
      }
    });
  }, [allSettings, filterTargetId, isStandardMode]); 

  // 優化無資料時的提示
  if (sortedEvents.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-slate-400 gap-3 py-12 bg-white rounded-xl border border-dashed border-slate-200">
        <span className="text-4xl">⏳</span>
        <p className="text-sm font-medium">
          {filterTargetId 
            ? `目前沒有找到與該項目相關的歷史紀錄。` 
            : `目前沒有任何歷史事件紀錄，請先在目錄建立事件。`}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto py-6 px-4 h-full overflow-y-auto">
      <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center tracking-wider">
        世界觀歷史紀事
      </h2>

      {/* 時間軸主體容器 */}
      <div className="relative border-l-2 border-slate-200 ml-4 md:ml-6 space-y-12 pb-12">
        
        {sortedEvents.map((event) => {
          // 🌟 核心優化 3：帶入第三個參數 event.fantasyDisplay，打通雙軌制分流渲染！
          const fantasyDate = formatFantasyDate(event.date, calendarConfig, event.fantasyDisplay);

          return (
            <div key={event.id} className="relative pl-8 md:pl-10 group">
              {/* 圓形節點 */}
              <div className="absolute -left-[11px] top-1.5 h-5 w-5 rounded-full border-4 border-white bg-emerald-500 shadow-sm group-hover:scale-110 transition-transform" />
              
              {/* 內容卡片 */}
              <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm hover:border-blue-400 hover:shadow-md transition-all">
                
                {/* 頂部：轉換後的世界觀時間 & 標籤 */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60 shadow-sm">
                    ⏳ {fantasyDate || (isStandardMode ? "未設定標準日期" : "未設定自訂時間")}
                  </span>
                  {event.location && (
                    <Badge variant="secondary" className="text-slate-500 font-medium bg-slate-100 border border-slate-200/40">
                      📍 {event.location}
                    </Badge>
                  )}
                </div>

                {/* 標題與內文 */}
                <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
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
    </div>
  );
}