// src/components/CharacterForm.tsx
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { SettingItem } from "@/lib/mockSettings"
import { useState } from "react";

// 🌟 1. 新增 Interface，並接收 onSave 函式與 allSettings
interface CharacterFormProps {
  item: SettingItem;
  onSave: (updatedItem: SettingItem) => void;
  allSettings?: { category: string; items: SettingItem[] }[]; // 接收全世界的資料
}

export default function CharacterForm({ item, onSave, allSettings = [] }: CharacterFormProps) { // 預設給空陣列防呆

  // 🌟 2. 新增基本欄位的狀態 (這樣修改後才能存檔)
  const [name, setName] = useState(item.name || "");
  const [faction, setFaction] = useState(item.faction || "independent");
  const [description, setDescription] = useState(item.description || "");

  // 稱號狀態
  const [titles, setTitles] = useState<string[]>(item.title ? [item.title] : []);

  // 自訂欄位狀態
  const [customFields, setCustomFields] = useState<{label: string, value: string}[]>(
    item.customFields || []
  );

  // 🌟 動態抓取全世界的所有組織 (Faction)
  const availableFactions = allSettings.flatMap(group => 
    group.items.filter(i => i.category === 'faction')
  );

  const handleAddTitle = () => setTitles([...titles, ""]);
  const handleRemoveTitle = (indexToRemove: number) => setTitles(titles.filter((_, index) => index !== indexToRemove));
  const handleTitleChange = (index: number, value: string) => {
    const newTitles = [...titles];
    newTitles[index] = value;
    setTitles(newTitles);
  };

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

  // 🌟 3. 實作點擊儲存按鈕的邏輯
  const handleSaveClick = () => {
    const updatedItem: SettingItem = {
      ...item,
      name: name,
      faction: faction,
      description: description,
      title: titles[0] || "", // 取第一個稱號當主稱號
      customFields: customFields
    };
    
    // 呼叫外部傳進來的 onSave
    onSave(updatedItem);
  };

  const fallbackChar = name.charAt(0) || "?";

  return (
    <div className="w-full h-full flex flex-col space-y-8">
      
      {/* 頂部：人物卡片視覺區 */}
      <div className="flex items-center gap-6 rounded-xl bg-slate-100/50 p-6 border border-slate-100">
        <Avatar className="h-20 w-20 border-2 border-white shadow-sm">
          <AvatarImage src="" alt={name} />
          <AvatarFallback className="text-2xl bg-slate-200 text-slate-700">{fallbackChar}</AvatarFallback>
        </Avatar>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">{name || "未命名人物"}</h2>
          <div className="flex gap-2">
            <Badge variant="default" className="bg-amber-600 hover:bg-amber-700">
              {/* 如果選到的組織在清單裡，就顯示該組織的名字，否則顯示無所屬 */}
              {availableFactions.find(f => f.id === faction)?.name || '無所屬'}
            </Badge>
            {titles.length > 0 && titles[0] !== "" && (
              <Badge variant="outline">{titles[0]}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* 底部：資料編輯區 */}
      <div className="space-y-5 flex-1">
        <div className="grid gap-2">
          <Label htmlFor="name">角色姓名</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} /> 
        </div>

        {/* 🌟 替換為動態產生的下拉選單 */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">所屬陣營</label>
          <select
            value={faction}
            onChange={(e) => setFaction(e.target.value)}
            className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="independent">無所屬</option>
            {availableFactions.map(f => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
          
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label>職位/稱號</Label>
            <button type="button" onClick={handleAddTitle} className="text-xs text-blue-600 hover:underline font-medium">
              + 新增稱號
            </button>
          </div>
          
          <div className="space-y-2">
            {titles.length === 0 && (
              <div className="text-sm text-slate-400 py-2">目前無設定稱號</div>
            )}
            {titles.map((title, index) => (
              <div key={index} className="flex gap-2">
                <Input 
                  value={title} 
                  onChange={(e) => handleTitleChange(index, e.target.value)} 
                  placeholder="例如：千戶長" 
                />
                <button 
                  type="button" 
                  onClick={() => handleRemoveTitle(index)}
                  className="text-red-500 hover:bg-red-50 px-3 rounded-md transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">詳細背景設定</Label>
          <Textarea
            id="description"
            className="min-h-[160px] resize-none leading-relaxed"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* 核心升級：世界觀自訂欄位引擎 */}
        <div className="grid gap-2 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <Label className="text-slate-700 font-bold flex items-center gap-2">
              ✨ 自訂屬性區塊
            </Label>
            <button 
              type="button" 
              onClick={handleAddCustomField} 
              className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline font-medium"
            >
              + 新增自訂欄位
            </button>
          </div>
          
          <div className="space-y-4 mt-2">
            {customFields.length === 0 && (
              <div className="text-sm text-slate-400 py-2">目前無自訂屬性，可根據世界觀自由新增。</div>
            )}
            {customFields.map((field, index) => (
              <div key={index} className="flex gap-3 items-start p-4 bg-slate-50 border border-slate-100 rounded-lg group">
                <div className="flex-1 space-y-3">
                  <Input 
                    value={field.label} 
                    onChange={(e) => handleCustomFieldChange(index, 'label', e.target.value)}
                    className="font-bold text-slate-700 bg-white border-slate-200 h-9"
                    placeholder="自訂欄位名稱 (例如：魔法屬性、替身能力)"
                  />
                  <Textarea
                    value={field.value}
                    onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)}
                    className="min-h-[80px] bg-white resize-none text-slate-600"
                    placeholder="輸入該屬性的詳細內容..."
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

        {/* 關係顯示區塊 */}
        <div className="grid gap-2 pt-4 border-t border-slate-100">
          <Label>關聯人物</Label>
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
        <button 
          onClick={handleSaveClick}
          className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded-md font-medium transition-colors"
        >
          儲存人物設定
        </button>
      </div>
    </div>
  )
}