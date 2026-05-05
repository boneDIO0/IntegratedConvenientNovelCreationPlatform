// src/components/FactionForm.tsx
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { SettingItem } from "@/lib/mockSettings"
import FormActionButtons from "@/components/FormActionButtons"
import { useState } from "react" // 🌟 1. 引入 useState

export default function FactionForm({ item }: { item: SettingItem }) {
  // 🌟 2. 建立 state 來管理階級字串，達成即時預覽 Badge 的效果
  const [hierarchyStr, setHierarchyStr] = useState(item.hierarchy?.join('，') || "");

  // 將字串即時轉回陣列，支援中英文逗號，並過濾掉空白項目
  const currentHierarchy = hierarchyStr
    .split(/[,，]/) 
    .map(rank => rank.trim())
    .filter(rank => rank !== "");

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{item.name}</h2>
          <p className="text-sm text-slate-500 mt-1">組織與陣營設定</p>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          組織 (Faction)
        </Badge>
      </div>

      <div className="space-y-5 flex-1">
        <div className="grid gap-2">
          <Label htmlFor="name">組織名稱</Label>
          <Input id="name" defaultValue={item.name} /> 
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="leader">現任領袖</Label>
            <Input id="leader" defaultValue={item.leader || ""} placeholder="例如：大汗、未知" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="territory">勢力範圍</Label>
            <Input id="territory" defaultValue={item.territory || ""} placeholder="例如：無盡大草原" />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="hierarchy">階級制度 (請用逗號分隔)</Label>
          {/* 🌟 3. 改成受控組件，綁定 onChange 達成即時連動 */}
          <Input 
            id="hierarchy" 
            value={hierarchyStr}
            onChange={(e) => setHierarchyStr(e.target.value)}
            placeholder="例如：大汗，萬戶長，千戶長" 
          />
          <div className="flex flex-wrap gap-2 mt-2 min-h-[28px]">
            {/* 🌟 4. 根據即時陣列動態渲染 Badge */}
            {currentHierarchy.length > 0 ? (
              currentHierarchy.map((rank, idx) => (
                <Badge key={idx} variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100">
                  {rank}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-slate-400">目前無階級設定</span>
            )}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">組織背景與文化</Label>
          <Textarea
            id="description"
            className="min-h-[120px] resize-none"
            defaultValue={item.description || ""}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
        <FormActionButtons saveText="儲存組織設定" />
      </div>
    </div>
  )
}