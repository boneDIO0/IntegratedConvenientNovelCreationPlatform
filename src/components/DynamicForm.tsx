'use client'

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { SettingItem } from "@/types"
import { useState, useEffect } from "react"

interface DynamicFormProps {
  item: SettingItem; 
  onSave?: (updatedItem: SettingItem) => void | Promise<void>; 
  onDirty?: () => void;
}

export default function DynamicForm({ 
  item, 
  onSave,
  onDirty
}: DynamicFormProps) {
  const itemContent = (item as any).content && typeof (item as any).content === 'object' 
    ? (item as any).content 
    : {};

  const [itemName, setItemName] = useState(item.name || item.title || "");
  const [customFields, setCustomFields] = useState<{ label: string; value: string }[]>(
    itemContent.customFields || item.customFields || []
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const content = (item as any).content && typeof (item as any).content === 'object' 
      ? (item as any).content 
      : {};

    setItemName(item.name || item.title || "");
    setCustomFields(content.customFields || item.customFields || []);
  }, [item]);

  const handleAddCustomField = () => {
    setCustomFields([...customFields, { label: "新屬性", value: "" }]);
    onDirty?.();
  };

  const handleRemoveCustomField = (indexToRemove: number) => {
    setCustomFields(customFields.filter((_, index) => index !== indexToRemove));
    onDirty?.();
  };

  const handleCustomFieldChange = (index: number, fieldKey: 'label' | 'value', newValue: string) => {
    const newFields = [...customFields];
    newFields[index][fieldKey] = newValue;
    setCustomFields(newFields);
    onDirty?.();
  };

  const handleSaveClick = async () => {
    if (!onSave || isSaving) return;

    const currentContent = {
      ...(item as any).content,
      customFields
    };

    const updatedItem = {
      ...item,
      name: itemName,
      title: itemName,
      customFields,
      content: currentContent
    } as SettingItem;

    try {
      setIsSaving(true);
      await onSave(updatedItem);
    } catch (error) {
      console.error("自訂卡片儲存失敗:", error);
      alert("❌ 儲存失敗，請檢查網路連線");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full min-h-full flex flex-col space-y-6 pb-24">
      {/* 頂部標題區 */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{itemName || "未命名項目"}</h2>
          <p className="text-sm text-slate-500 mt-1">自訂目錄項目</p>
        </div>
        <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
          ⚙️ 通用設定 (Custom)
        </Badge>
      </div>

      <div className="space-y-6 flex-1">
        {/* 基本資訊 */}
        <div className="grid gap-2">
          <Label htmlFor="name">項目名稱</Label>
          <Input 
            id="name" 
            value={itemName} 
            onChange={(e) => { setItemName(e.target.value); onDirty?.(); }} 
            placeholder="輸入項目名稱..." 
          /> 
        </div>

        {/* 自訂屬性區塊 */}
        <div className="grid gap-2 pt-2">
          <div className="flex items-center justify-between">
            <Label className="text-slate-700 font-bold flex items-center gap-2">
              ✨ 自訂屬性區塊
            </Label>
            <button 
              type="button" 
              onClick={handleAddCustomField} 
              className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline font-medium cursor-pointer"
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
                  className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-md transition-colors mt-1 cursor-pointer" 
                  title="移除此屬性"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 通用關係顯示區塊 */}
        <div className="grid gap-2 pt-4 border-t border-slate-100">
          <Label className="font-bold text-slate-700">關聯項目</Label>
          <div className="flex flex-wrap gap-2 p-3 rounded-md border border-slate-200 bg-slate-50">
            {item.relations && item.relations.length > 0 ? (
              item.relations.map((rel: any, index: number) => (
                <Badge key={index} variant="secondary" className="text-sm py-1 bg-white shadow-sm border-slate-200">
                  與 {rel.targetName || rel.name || rel.targetId} ({rel.type || rel.relation || "關聯"})
                </Badge>
              ))
            ) : (
              <span className="text-sm text-slate-400">目前無關聯設定</span>
            )}
          </div>
        </div>
      </div>

      {/* 底部控制區 */}
      <div className="flex justify-end gap-2 pt-6 pb-6 border-t border-slate-100">
        <button 
          onClick={handleSaveClick}
          disabled={isSaving}
          className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-md active:scale-95 cursor-pointer"
        >
          {isSaving ? "儲存中..." : "儲存設定"}
        </button>
      </div>
    </div>
  )
}