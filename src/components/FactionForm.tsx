// src/components/FactionForm.tsx
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { SettingItem } from "@/lib/mockSettings"
import { useState } from "react" 

// 🌟 1. 新增 Interface 接收 onSave
interface FactionFormProps {
  item: SettingItem;
  onSave: (updatedItem: SettingItem) => void;
}

export default function FactionForm({ item, onSave }: FactionFormProps) {
  // 🌟 2. 建立所有欄位的 state
  const [name, setName] = useState(item.name || "");
  const [leader, setLeader] = useState(item.leader || "");
  const [territory, setTerritory] = useState(item.territory || "");
  const [description, setDescription] = useState(item.description || "");
  
  // 管理階級字串的 state
  const [hierarchyStr, setHierarchyStr] = useState(item.hierarchy?.join('，') || "");

  // 將字串即時轉回陣列，支援中英文逗號，並過濾掉空白項目
  const currentHierarchy = hierarchyStr
    .split(/[,，]/) 
    .map(rank => rank.trim())
    .filter(rank => rank !== "");

  // 🌟 3. 實作存檔邏輯
  const handleSaveClick = () => {
    const updatedItem: SettingItem = {
      ...item,
      name,
      leader,
      territory,
      description,
      hierarchy: currentHierarchy // 將最新的階級陣列存進去
    };
    onSave(updatedItem);
  };

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{name || "未命名組織"}</h2>
          <p className="text-sm text-slate-500 mt-1">組織與陣營設定</p>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          組織 (Faction)
        </Badge>
      </div>

      <div className="space-y-5 flex-1">
        <div className="grid gap-2">
          <Label htmlFor="name">組織名稱</Label>
          {/* 🌟 綁定 value 與 onChange */}
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} /> 
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="leader">現任領袖</Label>
            <Input 
              id="leader" 
              value={leader} 
              onChange={(e) => setLeader(e.target.value)} 
              placeholder="例如：大汗、未知" 
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="territory">勢力範圍</Label>
            <Input 
              id="territory" 
              value={territory} 
              onChange={(e) => setTerritory(e.target.value)} 
              placeholder="例如：無盡大草原" 
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="hierarchy">階級制度 (請用逗號分隔)</Label>
          <Input 
            id="hierarchy" 
            value={hierarchyStr}
            onChange={(e) => setHierarchyStr(e.target.value)}
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
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
        {/* 🌟 4. 綁定存檔按鈕 */}
        <button 
          onClick={handleSaveClick}
          className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded-md font-medium transition-colors"
        >
          儲存組織設定
        </button>
      </div>
    </div>
  )
}