// src/components/TimelineView.tsx
"use client";

import { useMemo } from "react";
import { mockSettings, SettingItem } from "@/lib/mockSettings";
import { formatFantasyDate } from "@/lib/calendarEngine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TimelineViewProps {
  onEventClick?: (ids: string[]) => void;
  filterTargetId?: string; // 🌟 1. 新增：用來接收外部傳來的篩選 ID
}

export default function TimelineView({ onEventClick, filterTargetId }: TimelineViewProps) {
  // 🌟 2. 擴充：抓取、過濾並排序歷史事件
  const sortedEvents = useMemo(() => {
    const eventGroup = mockSettings.find((g) => g.category === "歷史事件 (Events)");
    let events = (eventGroup?.items || []) as SettingItem[];
    
    // 💡 核心過濾邏輯：如果有傳入 filterTargetId，就只保留「牽涉對象」包含該 ID 的事件
    if (filterTargetId) {
      events = events.filter(event => 
        event.relations?.some(rel => rel.targetId === filterTargetId)
      );
    }
    
    return events.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  }, [filterTargetId]); // 👈 記得把 filterTargetId 加入 dependency

  // 🌟 3. 優化無資料時的提示
  if (sortedEvents.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-slate-500 gap-2">
        <span className="text-4xl">📭</span>
        <p>
          {filterTargetId 
            ? `目前沒有找到與該項目相關的歷史紀錄。` 
            : `目前沒有任何歷史事件紀錄。`}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4 h-full overflow-y-auto">
      <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center tracking-wider">
        世界觀歷史紀事
      </h2>

      {/* 時間軸主體容器 */}
      <div className="relative border-l-2 border-slate-200 ml-4 md:ml-6 space-y-12 pb-12">
        
        {sortedEvents.map((event, index) => {
          // 呼叫我們的曆法引擎轉換時間！
          const fantasyDate = formatFantasyDate(event.date);

          return (
            <div key={event.id} className="relative pl-8 md:pl-10">
              {/* 圓形節點 (錨點) */}
              <div className="absolute -left-[11px] top-1.5 h-5 w-5 rounded-full border-4 border-white bg-emerald-500 shadow-sm" />
              
              {/* 內容卡片 */}
              <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                
                {/* 頂部：轉換後的世界觀時間 & 標籤 */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                    ⏳ {fantasyDate}
                  </span>
                  {event.location && (
                    <Badge variant="secondary" className="text-slate-500">
                      📍 {event.location}
                    </Badge>
                  )}
                </div>

                {/* 標題與內文 */}
                <h3 className="text-xl font-bold text-slate-800 mb-2">{event.name}</h3>
                <p className="text-slate-600 leading-relaxed">
                  {event.description}
                </p>

                {/* 如果有牽扯到其他組織或人物，可以在此顯示關聯 */}
                {event.relations && event.relations.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex gap-2">
                      <span className="text-xs text-slate-400 my-auto">牽涉對象：</span>
                      {event.relations.map((rel, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {rel.targetId} ({rel.type})
                        </Badge>
                      ))}
                    </div>
                    
                    {/* 🌟 核心按鈕：點擊後抽出所有 targetId 並觸發回傳 */}
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => {
                        if (onEventClick) {
                          const involvedIds = event.relations!.map(r => r.targetId);
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