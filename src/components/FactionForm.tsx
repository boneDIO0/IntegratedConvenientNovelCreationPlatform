'use client'

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { SettingItem } from "@/types"
import { useState, useEffect } from "react" 

interface FactionFormProps {
  item: SettingItem & { color?: string }; 
  allSettings: { category: string; items: SettingItem[] }[];
  onSave: (updatedItem: SettingItem) => void | Promise<void>;
  onDirty?: () => void; 
}

export default function FactionForm({ item, allSettings, onSave, onDirty }: FactionFormProps) {
  const itemContent = (item as any).content && typeof (item as any).content === 'object' 
    ? (item as any).content 
    : {};

  const [name, setName] = useState(item.name || item.title || "");
  const [leader, setLeader] = useState(itemContent.leader || item.leader || "");
  const [territory, setTerritory] = useState(itemContent.territory || item.territory || "");
  const [description, setDescription] = useState(itemContent.description || item.description || "");
  const [color, setColor] = useState(itemContent.color || item.color || "#64748b"); 
  const [hierarchyStr, setHierarchyStr] = useState(
    (itemContent.hierarchy || item.hierarchy)?.join('，') || ""
  );
  const [isSaving, setIsSaving] = useState(false);

  const availableCharacters = allSettings?.find((c: any) => {
    const cat = (c.category || c.categoryName || "").toLowerCase();
    return cat.includes("character") || cat.includes("人物") || cat.includes("角色");
  })?.items || [];

  const availableLocations = allSettings?.find((c: any) => {
    const cat = (c.category || c.categoryName || "").toLowerCase();
    return cat.includes("location") || cat.includes("地點");
  })?.items || [];

  useEffect(() => {
    const content = (item as any).content && typeof (item as any).content === 'object' 
      ? (item as any).content 
      : {};

    setName(item.name || item.title || "");
    setLeader(content.leader || item.leader || "");
    setTerritory(content.territory || item.territory || "");
    setDescription(content.description || item.description || "");
    setColor(content.color || item.color || "#64748b");
    setHierarchyStr((content.hierarchy || item.hierarchy)?.join('，') || "");
  }, [item]);

  const currentHierarchy: string[] = (hierarchyStr || "")
    .split(/[,，]/) 
    .map((rank: string) => rank.trim())
    .filter((rank: string) => rank !== "");

  const handleSaveClick = async () => {
    if (isSaving) return;

    const currentContent = {
      ...(item as any).content,
      leader,
      territory,
      description,
      hierarchy: currentHierarchy,
      color
    };

    const updatedItem = {
      ...item,
      name,
      title: name,
      leader,
      territory,
      description,
      hierarchy: currentHierarchy, 
      color,
      content: currentContent
    } as SettingItem;

    try {
      setIsSaving(true);
      await onSave(updatedItem);
    } catch (error) {
      console.error("組織設定儲存出錯:", error);
      alert("❌ 儲存失敗，請檢查網路連線");
    } finally {
      setIsSaving(false);
    }
  };

  const PRESET_COLORS = [
    "#3b82f6",
    "#ef4444",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#64748b"
  ];

  return (
    <div className="w-full min-h-full flex flex-col space-y-6 pb-24">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{name || "未命名組織"}</h2>
          <p className="text-sm text-slate-500 mt-1">組織與陣營設定</p>
        </div>
        <Badge 
          variant="outline" 
          style={{ borderColor: color, color: color, backgroundColor: `${color}10` }}
          className="transition-all duration-300"
        >
          🏛️ 組織 (Faction)
        </Badge>
      </div>

      <div className="space-y-5 flex-1">
        <div className="grid gap-2">
          <Label htmlFor="name">組織名稱</Label>
          <Input id="name" value={name} onChange={(e) => { setName(e.target.value); onDirty?.(); }} /> 
        </div>

        <div className="grid gap-3 p-4 bg-slate-50/50 rounded-xl border border-slate-200/60">
          <div className="flex items-center justify-between">
            <Label className="font-bold text-slate-700 flex items-center gap-2">
              🎨 關係圖專屬陣營色彩
            </Label>
            <span className="text-xs text-slate-400 font-mono uppercase">{color}</span>
          </div>
          <p className="text-xs text-slate-500">
            此顏色將會直接同步至「全域人物關係圖」中。屬於此陣營角色的外圈節點，將會渲染此色系。
          </p>
          
          <div className="flex items-center gap-4 mt-1">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-300 cursor-pointer shadow-sm group">
              <input 
                type="color" 
                value={color}
                onChange={(e) => { setColor(e.target.value); onDirty?.(); }}
                className="absolute inset-0 w-full h-full p-0 border-0 scale-150 cursor-pointer"
              />
            </div>

            <div className="flex gap-2">
              {PRESET_COLORS.map((pColor) => (
                <button
                  key={pColor}
                  type="button"
                  onClick={() => { setColor(pColor); onDirty?.(); }}
                  style={{ backgroundColor: pColor }}
                  className={`w-7 h-7 rounded-full transition-all hover:scale-110 cursor-pointer ${
                    color === pColor ? "ring-2 ring-offset-2 ring-slate-900 scale-105 shadow-sm" : "opacity-80"
                  }`}
                  title="套用推薦色"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="leader">現任領袖</Label>
            <select
              id="leader"
              value={leader}
              onChange={(e) => { setLeader(e.target.value); onDirty?.(); }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors text-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="">-- 請選取陣營領袖 (人物) --</option>
              {availableCharacters.map((char: SettingItem) => (
                <option key={char.id} value={char.name}>
                  👤 {char.name} {char.title ? `[${char.title}]` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="territory">勢力範圍 (大本營/領土)</Label>
            <select
              id="territory"
              value={territory}
              onChange={(e) => { setTerritory(e.target.value); onDirty?.(); }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors text-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="">-- 請選取核心領土 (地點) --</option>
              {availableLocations.map((loc: SettingItem) => (
                <option key={loc.id} value={loc.name}>
                  📍 {loc.name} {loc.parentId ? ' (子分區)' : ' (大分區)'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="hierarchy">階級制度 (請用逗號分隔)</Label>
          <Input 
            id="hierarchy" 
            value={hierarchyStr}
            onChange={(e) => { setHierarchyStr(e.target.value); onDirty?.(); }}
            placeholder="例如：大汗，萬戶長，千戶長" 
          />
          <div className="flex flex-wrap gap-2 mt-2 min-h-[28px]">
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
            value={description}
            onChange={(e) => { setDescription(e.target.value); onDirty?.(); }}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-6 pb-6 border-t border-slate-100">
        <button 
          onClick={handleSaveClick}
          disabled={isSaving}
          className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-md active:scale-95 cursor-pointer"
        >
          {isSaving ? "儲存中..." : "儲存組織設定"}
        </button>
      </div>
    </div>
  )
}