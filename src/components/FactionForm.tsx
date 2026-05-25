// src/components/FactionForm.tsx
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { SettingItem } from "@/lib/mockSettings"
import { useState } from "react" 

// 🌟 1. 擴充 Interface：支援 onDirty 回呼
interface FactionFormProps {
  item: SettingItem & { color?: string }; // 相容可能直接存在第一層的 color 欄位
  onSave: (updatedItem: SettingItem) => void | Promise<void>;
  onDirty?: () => void; // 🌟 讓打字、選顏色時即時亮起 *(已修改) 標籤
}

export default function FactionForm({ item, onSave, onDirty }: FactionFormProps) {
  // 🌟 2. 建立所有欄位的 state，並加入預設色彩Fallback（例如精緻的莫蘭迪灰 #64748b）
  const [name, setName] = useState(item.name || "");
  const [leader, setLeader] = useState(item.leader || "");
  const [territory, setTerritory] = useState(item.territory || "");
  const [description, setDescription] = useState(item.description || "");
  const [color, setColor] = useState(item.color || "#64748b"); 
  const [hierarchyStr, setHierarchyStr] = useState(item.hierarchy?.join('，') || "");
  const [saveStatus, setSaveStatus] = useState("儲存組織設定");

  // 將字串即時轉回陣列，支援中英文逗號，並過濾掉空白項目
  const currentHierarchy = hierarchyStr
    .split(/[,，]/) 
    .map(rank => rank.trim())
    .filter(rank => rank !== "");

  // 🌟 3. 實作存檔邏輯
  const handleSaveClick = async () => {
    const updatedItem: SettingItem = {
      ...item,
      name,
      leader,
      territory,
      description,
      hierarchy: currentHierarchy, // 將最新的階級陣列存進去
      color: color // 🌟 將自訂色彩包裹進 JSON 送給後端！
    };

    // 🎬 狀態 A：立刻進入儲存中
    setSaveStatus("儲存中...");

    try {
      // 呼叫父層 API 並等待 Neon 資料庫寫入成功
      await onSave(updatedItem);
      
      // 🎬 狀態 B：寫入成功，亮起綠色勾勾
      setSaveStatus("✅ 儲存成功！");
    } catch (error) {
      console.error(error);
      // 🎬 狀態 C：非預期破防防禦
      setSaveStatus("❌ 儲存失敗");
    }

    // 🎬 狀態 D：2 秒後自動滿血重置，恢復預設文字
    setTimeout(() => {
      setSaveStatus("儲存組織設定");
    }, 2000);
  };

  // 幾組幫創作者調配好的快捷世界觀推薦色（莫蘭迪色系）
  const PRESET_COLORS = [
    "#3b82f6", // 守序藍 (元風組織/正統王朝)
    "#ef4444", // 狂暴紅 (叛軍/部落)
    "#10b981", // 神祕綠 (精靈/魔法公會)
    "#f59e0b", // 富庶黃 (商會/黃金教派)
    "#8b5cf6", // 異能紫 (刺客結社/古老信仰)
    "#64748b"  // 中立灰 (散人/流浪者)
  ];

  return (
    <div className="w-full h-full flex flex-col space-y-6">
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

        {/* 🌟 核心新增：關係圖專屬色彩選擇器 */}
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
            {/* 原生色彩調色盤 */}
            <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-300 cursor-pointer shadow-sm group">
              <input 
                type="color" 
                value={color}
                onChange={(e) => { setColor(e.target.value); onDirty?.(); }}
                className="absolute inset-0 w-full h-full p-0 border-0 scale-150 cursor-pointer"
              />
            </div>

            {/* 快速推薦色塊群 */}
            <div className="flex gap-2">
              {PRESET_COLORS.map((pColor) => (
                <button
                  key={pColor}
                  type="button"
                  onClick={() => { setColor(pColor); onDirty?.(); }}
                  style={{ backgroundColor: pColor }}
                  className={`w-7 h-7 rounded-full transition-all hover:scale-110 ${
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
            <Input 
              id="leader" 
              value={leader} 
              onChange={(e) => { setLeader(e.target.value); onDirty?.(); }} 
              placeholder="例如：大汗、未知" 
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="territory">勢力範圍</Label>
            <Input 
              id="territory" 
              value={territory} 
              onChange={(e) => { setTerritory(e.target.value); onDirty?.(); }} 
              placeholder="例如：無盡大草原" 
            />
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

      <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
        <button 
          onClick={handleSaveClick}
          disabled={saveStatus !== "儲存組織設定"}
          className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md font-medium transition-all shadow-sm"
        >
          {saveStatus}
        </button>
      </div>
    </div>
  )
}