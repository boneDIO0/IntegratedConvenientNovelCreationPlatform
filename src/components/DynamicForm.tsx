'use client'

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { SettingItem } from "@/lib/mockSettings"
import { useState } from "react";

interface DynamicFormProps {
  item: SettingItem; 
  // 🌟 1. 調整型別相容 Promise，讓外部非同步儲存可以順利被 await 阻斷
  onSave?: (updatedItem: SettingItem) => void | Promise<void>; 
  onDirty?: () => void; // 🌟 新增：讓打字、更動欄位時能秒通知父層亮起 *(已修改)
}

export default function DynamicForm({ 
  item, 
  onSave,
  onDirty
}: DynamicFormProps) {
  
  // 項目名稱的 state
  const [itemName, setItemName] = useState(item.name || "");

  // 世界觀自訂欄位的狀態引擎
  const [customFields, setCustomFields] = useState<{label: string, value: string}[]>(
    item.customFields || []
  );

  // 🌟 2. 核心狀態：控制儲存按鈕的文字與動態效果
  const [saveStatus, setSaveStatus] = useState("儲存設定");

  const handleAddCustomField = () => {
    setCustomFields([...customFields, { label: "新屬性 (點擊修改)", value: "" }]);
    onDirty?.(); // 觸發髒數據標記
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

  // 🌟 3. 升級非同步存檔邏輯
  const handleSaveClick = async () => {
    if (!onSave) return;

    const updatedItem: SettingItem = {
      ...item,
      name: itemName,
      customFields: customFields, // 🌟 打開水管：完美儲存無限自訂欄位！
    };

    // 🎬 狀態 A：進入儲存中鎖定狀態
    setSaveStatus("儲存中...");

    try {
      // 等待外層 fetch 寫入 Neon 雲端資料庫
      await onSave(updatedItem);
      
      // 🎬 狀態 B：回傳 200 OK，顯示成功綠勾
      setSaveStatus("✅ 儲存成功！");
    } catch (error) {
      console.error("自訂卡片儲存失敗:", error);
      setSaveStatus("❌ 儲存失敗");
    }

    // 🎬 狀態 C：2 秒後自動滿血重置
    setTimeout(() => {
      setSaveStatus("儲存設定");
    }, 2000);
  };

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      
      {/* 頂部：極簡標題區 */}
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
        {/* 基本資訊：只有名稱 */}
        <div className="grid gap-2">
          <Label htmlFor="name">項目名稱</Label>
          <Input 
            id="name" 
            value={itemName} 
            onChange={(e) => { setItemName(e.target.value); onDirty?.(); }}
            placeholder="輸入項目名稱..." 
          /> 
        </div>

        {/* 核心引擎：無限自訂欄位 */}
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

        {/* 通用關係顯示區塊 */}
        <div className="grid gap-2 pt-4 border-t border-slate-100">
          <Label className="font-bold text-slate-700">關聯項目</Label>
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

      {/* 🌟 4. 底部控制區：實作防重複點擊鎖定（disabled）與多維度動畫文字 */}
      <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
        <button 
          onClick={handleSaveClick}
          disabled={saveStatus !== "儲存設定"}
          className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md font-medium transition-all shadow-sm"
        >
          {saveStatus}
        </button>
      </div>
    </div>
  )
}