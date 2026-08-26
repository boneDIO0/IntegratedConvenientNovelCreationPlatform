'use client'

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { SettingItem } from "@/types"
import { useState, useEffect } from "react";

interface CharacterFormProps {
  item: SettingItem & { 
    titles?: string[];
    relations?: any[];
  };
  onSave: (updatedItem: SettingItem) => void | Promise<void>;
  allSettings?: { category: string; items: SettingItem[] }[]; 
  currentChapterSettings?: { category: string; items: SettingItem[] }[]; 
  onDirty?: () => void; 
}

export default function CharacterForm({ 
  item, 
  onSave, 
  allSettings = [], 
  currentChapterSettings = [],
  onDirty 
}: CharacterFormProps) {
  const itemContent = (item as any).content && typeof (item as any).content === 'object' 
    ? (item as any).content 
    : {};

  // 1. 初始化欄位狀態（🌟 修正：只有在 content.titles 或 item.titles 是陣列時才讀取，絕不拿本名 fallback）
  const [name, setName] = useState(item.name || item.title || "");
  const [faction, setFaction] = useState(itemContent.faction || item.faction || "independent");
  const [description, setDescription] = useState(itemContent.description || item.description || "");

  const [titles, setTitles] = useState<string[]>(() => {
    if (Array.isArray(itemContent.titles)) return itemContent.titles;
    if (Array.isArray(item.titles)) return item.titles;
    return [];
  });

  const [customFields, setCustomFields] = useState<{ label: string; value: string }[]>(
    itemContent.customFields || item.customFields || []
  );

  const [relations, setRelations] = useState<any[]>(
    (itemContent.relations || item.relations || []).map((r: any) => {
      if (typeof r === 'string') {
        return { targetId: r, targetName: r, type: '關聯' };
      }
      return r;
    })
  );
  
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [relationType, setRelationType] = useState("好友");
  const [isSaving, setIsSaving] = useState(false);

  // 2. 監聽傳入 item 變更，同步刷新表單狀態
  useEffect(() => {
    const content = (item as any).content && typeof (item as any).content === 'object' 
      ? (item as any).content 
      : {};

    setName(item.name || item.title || "");
    setFaction(content.faction || item.faction || "independent");
    setDescription(content.description || item.description || "");
    
    // 🌟 修正：徹底杜絕拿 item.title（本名）作為稱號的錯誤
    const validTitles = Array.isArray(content.titles)
      ? content.titles
      : Array.isArray(item.titles)
      ? item.titles
      : [];
    setTitles(validTitles);

    setCustomFields(content.customFields || item.customFields || []);
    setRelations(
      (content.relations || item.relations || []).map((r: any) => {
        if (typeof r === 'string') {
          return { targetId: r, targetName: r, type: '關聯' };
        }
        return r;
      })
    );
  }, [item]);

  const availableFactions = allSettings.flatMap(group => 
    group.items.filter(i => i.category === 'faction')
  );

  const availableCharacters = allSettings
    .flatMap(group => group.items.filter(i => i.category === 'character' || i.id?.startsWith('char-'))) 
    .filter(char => char.id !== item.id && char.name !== name); 

  const handleAddTitle = () => { setTitles([...titles, ""]); onDirty?.(); };
  const handleRemoveTitle = (indexToRemove: number) => { setTitles(titles.filter((_, index) => index !== indexToRemove)); onDirty?.(); };
  const handleTitleChange = (index: number, value: string) => {
    const newTitles = [...titles];
    newTitles[index] = value;
    setTitles(newTitles);
    onDirty?.();
  };

  const handleAddCustomField = () => { setCustomFields([...customFields, { label: "新屬性", value: "" }]); onDirty?.(); };
  const handleRemoveCustomField = (indexToRemove: number) => { setCustomFields(customFields.filter((_, index) => index !== indexToRemove)); onDirty?.(); };
  const handleCustomFieldChange = (index: number, fieldKey: 'label' | 'value', newValue: string) => {
    const newFields = [...customFields];
    newFields[index][fieldKey] = newValue;
    setCustomFields(newFields);
    onDirty?.();
  };

  const handleAddRelation = () => {
    if (!selectedTargetId) return;
    if (relations.some(r => r.targetId === selectedTargetId || r.targetName === selectedTargetId)) {
      alert("已存在與該角色的關聯設定！");
      return;
    }
    
    const targetObj = availableCharacters.find(c => c.id === selectedTargetId);

    setRelations([...relations, { 
      targetId: selectedTargetId, 
      targetName: targetObj?.name || selectedTargetId,
      type: relationType,
      relation: relationType,
      name: targetObj?.name || selectedTargetId
    }]);
    setSelectedTargetId(""); 
    onDirty?.();
  };

  const handleRemoveRelation = (targetIdToRemove: string) => {
    setRelations(relations.filter(r => r.targetId !== targetIdToRemove && r.targetName !== targetIdToRemove));
    onDirty?.();
  };

  const handleSaveClick = async () => {
    if (isSaving) return;

    // 🌟 1. 過濾稱號陣列（去除空白與空字串）
    const cleanTitles = titles.map(t => t.trim()).filter(Boolean);

    const currentContent = {
      ...(item as any).content,
      faction,
      description,
      titles: cleanTitles,
      customFields,
      relations
    };

    // 🌟 2. 避免把本名寫入 title 欄位造成稱號污染
    const updatedItem = {
      ...item,
      name,
      title: cleanTitles[0] || name, // 後端若需要 title 則給首個稱號，若無才給 name
      faction,
      description,
      titles: cleanTitles,
      customFields,
      relations,
      content: currentContent
    } as SettingItem;
    
    try {
      setIsSaving(true);
      await onSave(updatedItem); 
    } catch (error) {
      console.error("人物設定儲存出錯:", error);
      alert("❌ 儲存失敗，請檢查網路連線");
    } finally {
      setIsSaving(false);
    }
  };

  const fallbackChar = name.charAt(0) || "?";

  return (
    <div className="w-full min-h-full flex flex-col space-y-8 pb-24">
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

            {titles.filter(t => t && t.trim() !== "").map((title, index) => (
              <Badge key={index} variant="outline">{title}</Badge>
            ))}
          </div>
        </div>
      </div>

      {/* 底部：資料編輯區 */}
      <div className="space-y-5 flex-1">
        <div className="grid gap-2">
          <Label htmlFor="name">角色姓名</Label>
          <Input id="name" value={name} onChange={(e) => { setName(e.target.value); onDirty?.(); }} /> 
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">所屬陣營</label>
          <select
            value={faction}
            onChange={(e) => { setFaction(e.target.value); onDirty?.(); }}
            className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white cursor-pointer"
          >
            <option value="independent">無所屬</option>
            {availableFactions.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
          
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label>職位/稱號</Label>
            <button type="button" onClick={handleAddTitle} className="text-xs text-blue-600 hover:underline font-medium cursor-pointer">
              + 新增稱號
            </button>
          </div>
          
          <div className="space-y-2">
            {titles.length === 0 && <div className="text-sm text-slate-400 py-2">目前無設定稱號</div>}
            {titles.map((title, index) => (
              <div key={index} className="flex gap-2">
                <Input value={title} onChange={(e) => handleTitleChange(index, e.target.value)} placeholder="例如：千戶長" />
                <button type="button" onClick={() => handleRemoveTitle(index)} className="text-red-500 hover:bg-red-50 px-3 rounded-md transition-colors cursor-pointer">✕</button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">詳細背景設定</Label>
          <Textarea id="description" className="min-h-[160px] resize-none leading-relaxed" value={description} onChange={(e) => { setDescription(e.target.value); onDirty?.(); }} /> 
        </div>

        {/* 自訂屬性區塊 */}
        <div className="grid gap-2 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <Label className="text-slate-700 font-bold flex items-center gap-2">✨ 自訂屬性區塊</Label>
            <button type="button" onClick={handleAddCustomField} className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline font-medium cursor-pointer">+ 新增自訂欄位</button>
          </div>
          
          <div className="space-y-4 mt-2">
            {customFields.length === 0 && <div className="text-sm text-slate-400 py-2">目前無自訂屬性，可根據世界觀自由新增。</div>}
            {customFields.map((field, index) => (
              <div key={index} className="flex gap-3 items-start p-4 bg-slate-50 border border-slate-100 rounded-lg group">
                <div className="flex-1 space-y-3">
                  <Input value={field.label} onChange={(e) => handleCustomFieldChange(index, 'label', e.target.value)} className="font-bold text-slate-700 bg-white border-slate-200 h-9" placeholder="自訂欄位名稱" />
                  <Textarea value={field.value} onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)} className="min-h-[80px] bg-white resize-none text-slate-600" placeholder="輸入詳細內容..." />
                </div>
                <button type="button" onClick={() => handleRemoveCustomField(index)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-md transition-colors mt-1 cursor-pointer">🗑️</button>
              </div>
            ))}
          </div>
        </div>

        {/* 關聯人物設定 */}
        <div className="grid gap-2 pt-4 border-t border-slate-100">
          <Label className="font-bold text-slate-700">關聯人物設定</Label>
          
          <div className="flex flex-wrap gap-2 items-center mb-2">
            <select
              value={selectedTargetId}
              onChange={(e) => setSelectedTargetId(e.target.value)}
              className="rounded-md border border-slate-300 p-2 text-sm focus:border-blue-500 focus:outline-none bg-white min-w-[180px] cursor-pointer"
            >
              <option value="">-- 選擇關聯對象 --</option>
              {availableCharacters.map(char => (
                <option key={char.id} value={char.id}>{char.name}</option>
              ))}
            </select>

            <Input value={relationType} onChange={(e) => setRelationType(e.target.value)} placeholder="關係 (例如：宿敵、親屬)" className="w-32 h-9" />
            <button type="button" onClick={handleAddRelation} disabled={!selectedTargetId} className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold px-4 py-2 h-9 rounded-md transition-colors cursor-pointer">+ 建立連結</button>
          </div>

          <div className="flex flex-wrap gap-2 p-4 rounded-xl border border-slate-200 bg-slate-50 min-h-[60px] items-center">
            {relations.length > 0 ? (
              relations.map((rel, index) => {
                const allCharactersInProject = allSettings.flatMap(g => g.items);
                const targetChar = allCharactersInProject.find(
                  c => c.id === rel.targetId || c.name === rel.targetName || c.name === rel.targetId
                );
                
                const displayTargetName = targetChar?.name || rel.targetName || rel.targetId || "未知角色";

                const chapterItems = currentChapterSettings.flatMap(g => g.items);
                const hasChapterFilter = currentChapterSettings.length > 0 && chapterItems.length > 0;
                
                const isAbsentInChapter = hasChapterFilter && !chapterItems.some(
                  c => c.id === rel.targetId || c.name === displayTargetName
                );

                return (
                  <Badge key={index} variant="secondary" className={`text-sm py-1 px-3 bg-white shadow-sm border-slate-200 flex items-center gap-2 transition-all ${isAbsentInChapter ? "opacity-60 saturate-50 bg-slate-100/70" : ""}`}>
                    <span>
                      👤 與 <strong className="text-blue-700">{displayTargetName}</strong> 的關係是【{rel.type || rel.relation || "關聯"}】
                      {isAbsentInChapter && <span className="text-xs text-slate-400 ml-1">(本章未登場)</span>}
                    </span>
                    <button type="button" onClick={() => handleRemoveRelation(rel.targetId || rel.targetName)} className="text-slate-400 hover:text-red-500 font-bold text-xs transition-colors cursor-pointer">✕</button>
                  </Badge>
                );
              })
            ) : (
              <span className="text-sm text-slate-400">目前無關聯設定，請用上方選擇器建立人物連結。</span>
            )}
          </div>
        </div>
      </div>

      {/* 底部按鈕區 */}
      <div className="flex justify-end gap-2 pt-6 pb-6 border-t border-slate-100">
        <button 
          onClick={handleSaveClick} 
          disabled={isSaving} 
          className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-md active:scale-95 cursor-pointer"
        >
          {isSaving ? "儲存中..." : "儲存人物設定"} 
        </button>
      </div>
    </div>
  );
}