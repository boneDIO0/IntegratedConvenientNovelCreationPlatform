// src/lib/templates.ts
import { SettingItem } from "./mockSettings";

// 定義模板的基本資訊
export type TemplateDef = {
  id: string;
  name: string;
  description: string;
  icon: string;
  initialData: { category: string; items: SettingItem[] }[];
};

export const PLATFORM_TEMPLATES: TemplateDef[] = [
  {
    id: "novel",
    name: "小說與 TRPG 世界觀",
    description: "包含人物、組織、物品與歷史事件，適合奇幻或科幻創作。",
    icon: "🐉",
    initialData: [
      { category: "人物 (Characters)", items: [] },
      { category: "組織 (Factions)", items: [] },
      { category: "物品 (Items)", items: [] },
      { category: "歷史事件 (Events)", items: [] }
    ]
  },
  {
    id: "resume",
    name: "個人履歷與專案",
    description: "用來梳理你的學經歷、專案作品與技能關聯圖。",
    icon: "💼",
    initialData: [
      { category: "工作經歷", items: [] },
      { category: "專案作品", items: [] },
      { category: "專業技能", items: [] }
    ]
  },
  {
    id: "notes",
    name: "學習筆記與知識圖譜",
    description: "適合用來做課程筆記，並建立不同概念之間的關係連線。",
    icon: "📚",
    initialData: [
      { category: "核心概念", items: [] },
      { category: "參考文獻", items: [] },
      { category: "實驗數據", items: [] }
    ]
  },
  {
    id: "blank",
    name: "完全空白",
    description: "沒有任何預設目錄，由你從零開始自由定義一切。",
    icon: "✨",
    initialData: []
  }
];