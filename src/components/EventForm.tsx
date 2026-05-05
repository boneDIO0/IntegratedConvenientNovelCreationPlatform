// src/components/EventForm.tsx
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { SettingItem } from "@/lib/mockSettings"
import FormActionButtons from "@/components/FormActionButtons"
import { formatFantasyDate } from "@/lib/calendarEngine" 
import { useState } from "react" // 🌟 1. 引入 useState

export default function EventForm({ item }: { item: SettingItem }) {
  // 🌟 2. 使用狀態來管理日期，讓上方世界觀時間可以「即時」連動變更！
  const [currentDate, setCurrentDate] = useState(item.date || "");

  // 將標準時間轉成世界觀時間 (現在會根據 currentDate 即時重新計算)
  const displayDate = formatFantasyDate(currentDate);

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{item.name}</h2>
          <p className="text-sm text-slate-500 mt-1">關鍵歷史事件紀錄</p>
        </div>
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
          歷史事件 (Event)
        </Badge>
      </div>

      <div className="space-y-5 flex-1">
        {/* 🌟 曆法引擎展示區塊 */}
        <div className="p-4 rounded-lg bg-slate-900 text-white shadow-inner flex flex-col gap-1 transition-colors">
          <span className="text-slate-400 text-xs">世界觀換算時間</span>
          <span className="text-xl font-bold tracking-wider text-emerald-400">
            {displayDate}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="date">標準時間 (YYYY-MM-DD)</Label>
            {/* 🌟 3. 改成受控組件 (Controlled Component)，綁定 onChange 達成即時連動 */}
            <Input 
              id="date" 
              type="date" 
              value={currentDate} 
              onChange={(e) => setCurrentDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="location">發生地點</Label>
            <Input id="location" defaultValue={item.location || ""} />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">事件詳細經過</Label>
          <Textarea
            id="description"
            className="min-h-[150px] resize-none"
            defaultValue={item.description || ""}
          />
        </div>

        {/* 🌟 4. 新增：牽涉對象顯示區塊 (比照人物卡設計) */}
        <div className="grid gap-2">
          <Label>牽涉對象</Label>
          <div className="flex flex-wrap gap-2 p-3 rounded-md border border-slate-200 bg-slate-50">
            {item.relations && item.relations.length > 0 ? (
              item.relations.map((rel, index) => (
                <Badge key={index} variant="secondary" className="text-sm py-1 bg-white border-slate-200 shadow-sm">
                  {rel.targetId} ({rel.type})
                </Badge>
              ))
            ) : (
              <span className="text-sm text-slate-400">目前無牽涉其他項目</span>
            )}
          </div>
        </div>
      </div>

      <FormActionButtons saveText="儲存事件紀錄" />
    </div>
  )
}