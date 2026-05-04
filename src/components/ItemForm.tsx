// src/components/ItemForm.tsx
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SettingItem } from "@/lib/mockSettings"
import FormActionButtons from "@/components/FormActionButtons"
import { useState } from "react" // 🌟 1. 引入 useState

export default function ItemForm({ item }: { item: SettingItem }) {
  // 🌟 2. 使用狀態來管理物品類型，讓頂部標籤與 UI 可以即時連動變更
  const [itemType, setItemType] = useState(item.itemType || "artifact");

  // 根據類型動態決定標籤的顏色與文字
  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'weapon': return { text: '常規武器 (Weapon)', color: 'bg-red-50 text-red-700 border-red-200' };
      case 'consumable': return { text: '消耗品 (Consumable)', color: 'bg-green-50 text-green-700 border-green-200' };
      case 'skill': return { text: '特殊技能 (Skill)', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'artifact':
      default: return { text: '古代遺物/聖物 (Artifact)', color: 'bg-purple-50 text-purple-700 border-purple-200' };
    }
  };

  const typeInfo = getTypeInfo(itemType);

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{item.name}</h2>
          <p className="text-sm text-slate-500 mt-1">特殊物品與技能設定</p>
        </div>
        {/* 🌟 3. 套用動態變化的標籤樣式 */}
        <Badge variant="outline" className={`${typeInfo.color} transition-colors`}>
          {typeInfo.text}
        </Badge>
      </div>

      <div className="space-y-5 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">物品/技能名稱</Label>
            <Input id="name" defaultValue={item.name} /> 
          </div>
          <div className="grid gap-2">
            <Label htmlFor="itemType">類型</Label>
            {/* 🌟 加上 as 進行型別斷言，告訴 TS 這個 value 絕對安全 */}
            <Select 
              value={itemType} 
              onValueChange={(value) => setItemType(value as "weapon" | "artifact" | "consumable" | "skill")}
            >
              <SelectTrigger id="itemType">
                <SelectValue placeholder="選擇類型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weapon">常規武器</SelectItem>
                <SelectItem value="artifact">古代遺物 / 聖物</SelectItem>
                <SelectItem value="consumable">消耗品</SelectItem>
                <SelectItem value="skill">特殊技能</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 🌟 核心機制：共鳴效果 */}
        <div className="grid gap-2 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <Label htmlFor="resonance" className="text-amber-900 font-bold flex items-center gap-2">
            ✨ 共鳴效果 (Resonance Effect)
          </Label>
          <p className="text-xs text-amber-700 mb-2">
            {/* 根據類型動態改變提示文案 */}
            請避免填寫絕對數值。描述此{itemType === 'skill' ? '技能' : '物品'}如何與環境、物理法則或使用者精神產生互動。
          </p>
          <Textarea
            id="resonance"
            className="min-h-[100px] resize-none border-amber-300 focus-visible:ring-amber-500"
            defaultValue={item.resonanceEffect || ""}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">外觀與歷史背景</Label>
          <Textarea
            id="description"
            className="min-h-[100px] resize-none"
            defaultValue={item.description || ""}
          />
        </div>

        {/* 🌟 5. 新增：牽涉對象顯示區塊 (比照人物卡與事件卡設計) */}
        <div className="grid gap-2">
          <Label>擁有者與關聯對象</Label>
          <div className="flex flex-wrap gap-2 p-3 rounded-md border border-slate-200 bg-slate-50">
            {item.relations && item.relations.length > 0 ? (
              item.relations.map((rel, index) => (
                <Badge key={index} variant="secondary" className="text-sm py-1 bg-white border-slate-200 shadow-sm">
                  {rel.targetId} ({rel.type})
                </Badge>
              ))
            ) : (
              <span className="text-sm text-slate-400">目前無關聯設定</span>
            )}
          </div>
        </div>

      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
        <FormActionButtons saveText="儲存設定" />
      </div>
    </div>
  )
}