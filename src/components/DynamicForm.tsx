// src/components/DynamicForm.tsx
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { SettingItem } from "@/lib/mockSettings"
import { useState } from "react";
import FormActionButtons from "@/components/FormActionButtons"

export default function DynamicForm({ item }: { item: SettingItem }) {
  // 🌟 只保留世界觀自訂欄位的狀態引擎
  const [customFields, setCustomFields] = useState<{label: string, value: string}[]>(
    item.customFields || []
  );

  const handleAddCustomField = () => {
    setCustomFields([...customFields, { label: "新屬性 (點擊修改)", value: "" }]);
  };

  const handleRemoveCustomField = (indexToRemove: number) => {
    setCustomFields(customFields.filter((_, index) => index !== indexToRemove));
  };

  const handleCustomFieldChange = (index: number, fieldKey: 'label' | 'value', newValue: string) => {
    const newFields = [...customFields];
    newFields[index][fieldKey] = newValue;
    setCustomFields(newFields);
  };

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      
      {/* 🌟 頂部：極簡標題區 */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{item.name || "未命名項目"}</h2>
          <p className="text-sm text-slate-500 mt-1">自訂目錄項目</p>
        </div>
        <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
          通用設定 (Custom)
        </Badge>
      </div>

      <div className="space-y-6 flex-1">
        {/* 🌟 基本資訊：只有名稱 */}
        <div className="grid gap-2">
          <Label htmlFor="name">項目名稱</Label>
          <Input id="name" defaultValue={item.name} placeholder="輸入項目名稱..." /> 
        </div>

        {/* 🌟 核心引擎：無限自訂欄位 */}
        <div className="grid gap-2 pt-2">
          <div className="flex items-center justify-between">
            <Label className="text-slate-700 font-bold flex items-center gap-2">
              ✨ 自訂屬性區塊
            </Label>
            <button 
              type="button" 
              onClick={handleAddCustomField} 
              className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline font-medium"
            >
              + 新增欄位
            </button>
          </div>
          
          <div className="space-y-4 mt-2">
            {customFields.length === 0 && (
              <div className="text-sm text-slate-400 py-4 text-center border-2 border-dashed border-slate-100 rounded-lg">
                目前為全空白，請點擊右上方新增專屬欄位。
              </div>
            )}
            {customFields.map((field, index) => (
              <div key={index} className="flex gap-3 items-start p-4 bg-slate-50 border border-slate-100 rounded-lg group">
                <div className="flex-1 space-y-3">
                  <Input 
                    value={field.label} 
                    onChange={(e) => handleCustomFieldChange(index, 'label', e.target.value)}
                    className="font-bold text-slate-700 bg-white border-slate-200 h-9"
                    placeholder="欄位名稱 (例如：擔任職務、核心概念)"
                  />
                  <Textarea
                    value={field.value}
                    onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)}
                    className="min-h-[80px] bg-white resize-none text-slate-600"
                    placeholder="輸入詳細內容..."
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => handleRemoveCustomField(index)}
                  className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-md transition-colors mt-1"
                  title="移除此屬性"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 🌟 通用關係顯示區塊 */}
        <div className="grid gap-2 pt-4 border-t border-slate-100">
          <Label>關聯項目</Label>
          <div className="flex flex-wrap gap-2 p-3 rounded-md border border-slate-200 bg-slate-50">
            {item.relations && item.relations.length > 0 ? (
              item.relations.map((rel, index) => (
                <Badge key={index} variant="secondary" className="text-sm py-1 bg-white shadow-sm border-slate-200">
                  與 {rel.targetId} ({rel.type})
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