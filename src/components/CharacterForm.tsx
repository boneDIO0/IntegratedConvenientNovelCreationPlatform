'use client'

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { SettingItem } from "@/lib/mockSettings"
import { useState } from "react";

interface CharacterFormProps {
  item: SettingItem & { 
    titles?: string[];
    relations?: { targetId: string; type: string }[]; // 確保介面定義完整
  };
  onSave: (updatedItem: SettingItem) => void | Promise<void>;
  allSettings?: { category: string; items: SettingItem[] }[]; 
}

export default function CharacterForm({ item, onSave, allSettings = [] }: CharacterFormProps) {

  // 基本欄位狀態
  const [name, setName] = useState(item.name || "");
  const [faction, setFaction] = useState(item.faction || "independent");
  const [description, setDescription] = useState(item.description || "");

  // 稱號狀態
  const [titles, setTitles] = useState<string[]>(
    item.titles || (item.title ? [item.title] : [])
  );

  // 自訂欄位狀態
  const [customFields, setCustomFields] = useState<{label: string, value: string}[]>(
    item.customFields || []
  );

  // 🌟 1. 關聯人物狀態：初始化當前角色的關聯
  const [relations, setRelations] = useState<{ targetId: string; type: string }[]>(
    item.relations || []
  );
  
  // 🌟 臨時狀態：暫存目前畫面上選擇的關聯對象與關係類型
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [relationType, setRelationType] = useState("好友");

  const [saveStatus, setSaveStatus] = useState("儲存人物設定");

  // 動態抓取全世界的所有組織 (Faction)
  const availableFactions = allSettings.flatMap(group => 
    group.items.filter(i => i.category === 'faction')
  );

  // 🌟 2. 用全作品總庫，動態抓取所有「其他角色」作為可關聯候選人 (下拉選單用)
  const availableCharacters = allSettings
    .flatMap(group => group.items.filter(i => i.category === 'character' || i.id?.startsWith('char-'))) // 相容可能的人物分類標記
    .filter(char => char.id !== item.id && char.name !== name); // 排除自己

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

  // 🌟 3. 新增關聯處理函式
  const handleAddRelation = () => {
    if (!selectedTargetId) return;
    // 檢查是否已經存在相同人的關聯
    if (relations.some(r => r.targetId === selectedTargetId)) {
      alert("已存在與該角色的關聯設定！");
      return;
    }
    setRelations([...relations, { targetId: selectedTargetId, type: relationType }]);
    setSelectedTargetId(""); // 加完後重設選擇器
  };

  // 🌟 4. 移除關聯處理函式
  const handleRemoveRelation = (targetIdToRemove: string) => {
    setRelations(relations.filter(r => r.targetId !== targetIdToRemove));
  };

  // 實作點擊儲存按鈕的邏輯
  const handleSaveClick = async () => {
    const updatedItem = {
      ...item,
      name: name,
      faction: faction,
      description: description,
      title: titles[0] || "", 
      titles: titles,         
      customFields: customFields,
      relations: relations // 🌟 5. 將最新的關係陣列一起打包塞進 JSON 送給後端！
    };
    
    setSaveStatus("儲存中...");
    
    try {
      await onSave(updatedItem); 
      setSaveStatus("✅ 儲存成功！");
    } catch (error) {
      setSaveStatus("❌ 儲存失敗");
    }

    setTimeout(() => {
      setSaveStatus("儲存人物設定");
    }, 2000);
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
          <div className="flex gap-2 flex-wrap"> 
            <Badge variant="default" className="bg-amber-600 hover:bg-amber-700">
              {availableFactions.find(f => f.id === faction)?.name || '無所屬'}
            </Badge>

            {titles.filter(t => t.trim() !== "").map((title, index) => (
              <Badge key={index} variant="outline">{title}</Badge>
            ))}
          </div>
        </div>
      </div>

      {/* 底部：資料編輯區 */}
      <div className="space-y-5 flex-1">
        <div className="grid gap-2">
          <Label htmlFor="name">角色姓名</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} /> 
        </div>

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

        {/* 世界觀自訂欄位引擎 */}
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

        {/* 🌟 核心修改：動態關係建立與顯示區塊 */}
        <div className="grid gap-2 pt-4 border-t border-slate-100">
          <Label className="font-bold text-slate-700">關聯人物設定</Label>
          
          {/* 選擇與新增控制列 */}
          <div className="flex flex-wrap gap-2 items-center mb-2">
            <select
              value={selectedTargetId}
              onChange={(e) => setSelectedTargetId(e.target.value)}
              className="rounded-md border border-slate-300 p-2 text-sm focus:border-blue-500 focus:outline-none bg-white min-w-[180px]"
            >
              <option value="">-- 選擇關聯對象 --</option>
              {availableCharacters.map(char => (
                <option key={char.id} value={char.id}>{char.name}</option>
              ))}
            </select>

            <Input 
              value={relationType} 
              onChange={(e) => setRelationType(e.target.value)} 
              placeholder="關係 (例如：宿敵、親屬)" 
              className="w-32 h-9"
            />

            <button
              type="button"
              onClick={handleAddRelation}
              disabled={!selectedTargetId}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold px-4 py-2 h-9 rounded-md transition-colors"
            >
              + 建立連結
            </button>
          </div>

          {/* 渲染現有的關聯標籤 */}
          <div className="flex flex-wrap gap-2 p-4 rounded-xl border border-slate-200 bg-slate-50 min-h-[60px] items-center">
            {relations.length > 0 ? (
              relations.map((rel, index) => {
                // 🌟 修正點：改用全域總庫（allSettings）做無差別扁平反查，防止本章未登場角色變亂碼
                const allCharactersInProject = allSettings.flatMap(g => g.items);
                const targetChar = allCharactersInProject.find(c => c.id === rel.targetId);
                const targetName = targetChar?.name || rel.targetId;

                // 🌟 UX 加分項：判斷該角色是否在「目前章節的可選清單」中，如果不在代表本章未登場
                const isAbsentInChapter = !availableCharacters.some(c => c.id === rel.targetId);

                return (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className={`text-sm py-1 px-3 bg-white shadow-sm border-slate-200 flex items-center gap-2 transition-all ${
                      isAbsentInChapter ? "opacity-60 saturate-50 bg-slate-100/70" : ""
                    }`}
                  >
                    <span>
                      👤 與 <strong className="text-blue-700">{targetName}</strong> 的關係是【{rel.type}】
                      {isAbsentInChapter && <span className="text-xs text-slate-400 ml-1">(本章未登場)</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRelation(rel.targetId)}
                      className="text-slate-400 hover:text-red-500 font-bold text-xs transition-colors"
                      title="解除此關聯"
                    >
                      ✕
                    </button>
                  </Badge>
                )
              })
            ) : (
              <span className="text-sm text-slate-400">目前無關聯設定，請用上方選擇器建立人物連結。</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
        <button 
          onClick={handleSaveClick}
          disabled={saveStatus !== "儲存人物設定"} 
          className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white px-6 py-2 rounded-md font-medium transition-colors"
        >
          {saveStatus} 
        </button>
      </div>
    </div>
  )
}