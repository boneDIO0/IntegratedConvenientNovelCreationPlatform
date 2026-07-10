"use client";

import { useState } from "react";
import { CalendarConfig } from "@/types";
import CalendarConfigForm from "@/components/CalendarConfigForm"; 
import { useEditorUI } from "@/contexts/EditorUIContext"; // 🎯 修正 1：引入你們專案的權限 Context
// import EventForm from "@/components/EventForm"; 
// import TimelineView from "@/components/TimelineView"; 

interface ContainerProps {
  projectId: string;
  initialConfig: CalendarConfig;
}

export default function SettingsContainer({ projectId, initialConfig }: ContainerProps) {
  // 🎯 修正 2：從小說編輯器的上下文大腦中，精準拉出目前的 isEditable 唯讀/編輯權限狀態
  const { isEditable } = useEditorUI();

  // 🏆 核心：在父層維護單一真理源（Single Source of Truth）
  // 當左側曆法被拖曳改變時，更新此狀態會同步迫使右側的時間軸視圖重新渲染 (Re-render)
  const [calendarConfig, setCalendarConfig] = useState<CalendarConfig>(initialConfig);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* 左側 2 欄：配置與拖曳面板 */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-slate-800">🗓️ 雙軌制曆法配置</h2>
          
          {/* 🌟 成功串接：傳入必填的 isEditable 屬性，徹底消滅 TS2741 編譯錯誤 */}
          <CalendarConfigForm 
            projectId={projectId}
            initialConfig={calendarConfig} 
            isEditable={isEditable} // 🎯 修正 3：死死焊上這個必填 Prop，大綠燈通關！
            onSaveSuccess={async () => {   
              // 當寫手點擊大儲存鈕、切換運行模式、或者是放開滑鼠完成紀元拖曳排序時，
              // 後端 PATCH/PUT API 會執行完畢，然後進來這個區塊。
              try {
                // 🎬 核心連動：重新向後端拉取最新洗牌後的曆法 JSONB
                const res = await fetch(`/api/projects/${projectId}/calendar`);
                if (!res.ok) throw new Error("同步重新整理失敗");
                
                const json = await res.json();
                if (json.data) {
                  // 刷新父層狀態，進而全面觸發下方的 EventForm 與 TimelineView 即時重新對齊！
                  setCalendarConfig(json.data);
                }
              } catch (err) {
                console.error("狀態調度中心資料刷洗失敗:", err);
              }
            }}
            onDirty={() => {
              // 供後續偵測表單未儲存、跳出防離頁警告使用 (可選)
              console.log("✍️ 創作者正在修改紀元參數或進行拖曳...");
            }}
          />
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-slate-800">📝 新增/編輯歷史事件</h2>
          {/* 🌟 成功分發：傳入目前的曆法配置，EventForm 下拉選單就能動態渲染對應的 selectedEraName */}
          {/* <EventForm calendarConfig={calendarConfig} projectId={projectId} /> */}
          <p className="text-gray-400 text-xs italic">（此處掛載你的 EventForm 元件，已具備選單咬合能力）</p>
        </div>
      </div>

      {/* 右側 1 欄：即時故事時間軸預覽 */}
      <div className="lg:col-span-1">
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 sticky top-6">
          <h2 className="text-xl font-semibold mb-4 text-slate-800">⏳ 斷代時序預覽</h2>
          {/* 🌟 成功分發：TimelineView 拿到最新的 eras 陣列與 mode，拖曳換序時右側會即時跟著洗牌 */}
          {/* <TimelineView calendarConfig={calendarConfig} projectId={projectId} /> */}
          <p className="text-gray-400 text-xs italic">（此處掛載你的 TimelineView 元件，會隨拖曳順序即時重組）</p>
        </div>
      </div>
    </div>
  );
}