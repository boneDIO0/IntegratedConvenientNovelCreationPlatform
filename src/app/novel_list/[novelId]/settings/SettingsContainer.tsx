"use client";

import { useState, useEffect } from "react";
import { CalendarConfig } from "@/types";
import CalendarConfigForm from "@/components/CalendarConfigForm"; 
import { useEditorUI } from "@/contexts/EditorUIContext";
// import EventForm from "@/components/EventForm"; 
// import TimelineView from "@/components/TimelineView"; 

interface ContainerProps {
  projectId: string;
  initialConfig: CalendarConfig;
  isEditable?: boolean; // 👈 支援可選傳入，避免完全綁死 Context
}

export default function SettingsContainer({ 
  projectId, 
  initialConfig, 
  isEditable: propIsEditable 
}: ContainerProps) {
  // 🌟 安全取用 Context（若無 Provider 則 fallback 至 prop 或 true）
  let contextEditable = true;
  try {
    const editorUI = useEditorUI();
    if (editorUI && typeof editorUI.isEditable === 'boolean') {
      contextEditable = editorUI.isEditable;
    }
  } catch {
    contextEditable = true;
  }

  const isEditable = propIsEditable !== undefined ? propIsEditable : contextEditable;

  // 🏆 維護單一真理源
  const [calendarConfig, setCalendarConfig] = useState<CalendarConfig>(initialConfig);

  // 🌟 當 props 傳入的 initialConfig 發生改變時同步更新
  useEffect(() => {
    if (initialConfig) {
      setCalendarConfig(initialConfig);
    }
  }, [initialConfig]);

  const handleSaveSuccess = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/calendar`);
      if (!res.ok) throw new Error("同步重新整理失敗");
      
      const json = await res.json();
      const updatedData = json.data || json;
      if (updatedData && typeof updatedData === 'object') {
        setCalendarConfig(updatedData);
      }
    } catch (err) {
      console.error("狀態調度中心資料刷洗失敗:", err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* 左側 2 欄：配置與拖曳面板 */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-slate-800">🗓️ 雙軌制曆法配置</h2>
          
          <CalendarConfigForm 
            projectId={projectId}
            initialConfig={calendarConfig} 
            isEditable={isEditable}
            onSaveSuccess={handleSaveSuccess}
            onDirty={() => {
              console.log("✍️ 創作者正在修改紀元參數或進行拖曳...");
            }}
          />
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-slate-800">📝 新增/編輯歷史事件</h2>
          {/* <EventForm calendarConfig={calendarConfig} projectId={projectId} isEditable={isEditable} /> */}
          <p className="text-gray-400 text-xs italic">（此處掛載 EventForm 元件）</p>
        </div>
      </div>

      {/* 右側 1 欄：即時故事時間軸預覽 */}
      <div className="lg:col-span-1">
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 sticky top-6">
          <h2 className="text-xl font-semibold mb-4 text-slate-800">⏳ 斷代時序預覽</h2>
          {/* <TimelineView calendarConfig={calendarConfig} projectId={projectId} /> */}
          <p className="text-gray-400 text-xs italic">（此處掛載 TimelineView 元件，會隨拖曳順序即時重組）</p>
        </div>
      </div>
    </div>
  );
}