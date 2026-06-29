'use client'

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// 🌟 定義單個紀元資料結構（對齊全域與資料庫欄位）
interface EraData {
  id: string;      // 供拖曳追蹤用的唯一識別碼 (通常為隨機 UUID 或臨時 timestamp)
  name: string;    // 紀元名稱（例如：古曆、聖曆、元風紀元）
  startYear?: number;
}

interface SortableEraItemProps {
  era: EraData;
  index: number;
  onUpdate: (id: string, updatedFields: Partial<EraData>) => void;
  onRemove: (id: string) => void;
}

export default function SortableEraItem({ era, index, onUpdate, onRemove }: SortableEraItemProps) {
  // 🌟 調用 @dnd-kit 的 Sortable 核心 Hook
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: era.id });

  // 處理拖曳時的平移與過渡動畫樣式
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // 拖曳中降低透明度，提供更棒的視覺回饋（UX 加分點）
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 bg-white p-4 rounded-xl border transition-all ${
        isDragging 
          ? "border-blue-500 shadow-lg scale-[1.02] ring-2 ring-blue-100" 
          : "border-slate-200 shadow-sm hover:border-slate-300"
      }`}
    >
      {/* 🌟 拖曳把手 (Grip Handle)：只有點擊這裡才能觸發拖曳，防止與 Input 輸入框文字選取衝突 */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
        title="拖曳調整紀元順序"
      >
        {/* 經典的 6 點矩陣拖曳圖示 */}
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="5" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="9" cy="19" r="1" />
          <circle cx="15" cy="5" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="19" r="1" />
        </svg>
      </div>

      {/* 顯示當前排序編號（UX 圍欄：讓使用者看清楚目前是第幾個時期） */}
      <span className="text-xs font-bold bg-slate-100 text-slate-500 w-6 h-6 rounded-full flex items-center justify-center border border-slate-200">
        {index + 1}
      </span>

      {/* 紀元名稱輸入框 */}
      <div className="flex-1 min-w-[150px]">
        <Input
          type="text"
          placeholder="例如：創世紀、星劫期"
          value={era.name}
          className="font-medium text-slate-800 focus-visible:ring-blue-500"
          onChange={(e) => onUpdate(era.id, { name: e.target.value })}
        />
      </div>

      {/* 基準初始年分 (選填，如果是雙軌制對齊用) */}
      <div className="w-28">
        <Input
          type="number"
          placeholder="初始年(選填)"
          value={era.startYear ?? ""}
          className="text-center text-slate-600"
          onChange={(e) => {
            const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
            onUpdate(era.id, { startYear: val });
          }}
        />
      </div>

      {/* 刪除按紐 */}
      <Button
        variant="ghost"
        size="sm"
        className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg p-2"
        onClick={() => onRemove(era.id)}
        title="刪除此紀元時期"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
      </Button>
    </div>
  );
}