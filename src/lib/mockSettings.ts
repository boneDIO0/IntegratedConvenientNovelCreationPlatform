// src/lib/mockSettings.ts

export type Relation = {
  targetId: string;
  type: string;
};

// 🌟 擴充核心 Schema：加入組織與物品的專屬欄位，並加上 color 欄位防止 TS 破防
export type SettingItem = {
  id: string;
  name: string;
  // 將原本寫死的 4 種型別，擴充加入 'custom' 與通用的 string
  category: 'character' | 'faction' | 'item' | 'event' | 'custom' | string;
  description?: string;
  relations?: Relation[];
  
  // 🌟 核心新增：關係圖專屬陣營/組織色彩（選填，符合多型卡片擴充規格）
  color?: string; 

  // (保留人物專屬欄位)
  faction?: string;
  title?: string;
  
  // (保留組織專屬欄位)
  leader?: string;
  territory?: string;
  hierarchy?: string[];

  // (保留物品/事件專屬欄位)
  itemType?: "weapon" | "artifact" | "consumable" | "skill";
  resonanceEffect?: string;
  date?: string;
  location?: string;

  // 支援所有類型的無限自訂欄位陣列！
  customFields?: { label: string; value: string }[];
};

// 🌟 擴充 Mock Data：注入世界觀細節、共鳴設定與專屬關係圖色彩
export const mockSettings: { category: string; items: SettingItem[] }[] = [
  {
    category: "人物 (Characters)",
    items: [
      { 
        id: "c1", 
        name: "查干不花", 
        category: 'character',
        faction: "f2", // 💡 修正：對齊下方金帳汗國的真實 ID "f2"
        title: "千戶長", 
        description: "金帳汗國的勇悍將領。作戰時習慣帶著象徵家族榮耀的彎刀，性格剛烈但對汗國極度忠誠。",
        relations: [{ targetId: "c2", type: "敬畏" }, { targetId: "f2", type: "效忠" }]
      },
      { 
        id: "c2", 
        name: "薩滿長老", 
        category: 'character',
        faction: "f1", // 💡 修正：對齊下方觀測者的真實 ID "f1"
        title: "大薩滿", 
        description: "能與長生天溝通的智者，負責記錄舊日廢墟的變遷，是各方勢力都不敢輕易得罪的存在。",
        relations: [{ targetId: "c1", type: "觀察對象" }, { targetId: "i1", type: "守護" }]
      },
    ]
  },
  {
    category: "組織 (Factions)",
    items: [
      { 
        id: "f2", 
        name: "金帳汗國", 
        category: 'faction',
        leader: "大汗",
        territory: "無盡大草原與舊日廢墟邊境",
        hierarchy: ["大汗", "萬戶長", "千戶長", "百戶長", "薩滿"],
        description: "崇尚武力與自然法則的龐大游牧帝國，以高度機動性的騎兵與薩滿的秘術統治草原。",
        relations: [{ targetId: "f1", type: "互相提防" }],
        color: "#ef4444" // 🌟 注入專屬色彩：游牧狂暴紅
      },
      { 
        id: "f1", 
        name: "觀測者", 
        category: 'faction',
        leader: "未知",
        territory: "隱秘的星象塔",
        hierarchy: ["執行官", "記錄者", "大薩滿"],
        description: "中立且神秘的學者組織，致力於記錄歷史與回收危險的古代遺物。",
        color: "#3b82f6" // 🌟 注入專屬色彩：奧術中立藍
      },
    ]
  },
  {
    category: "物品與技能 (Items & Skills)",
    items: [
      { 
        id: "i1", 
        name: "蒼狼骨笛", 
        category: 'item',
        itemType: "artifact",
        resonanceEffect: "當吹奏者精神高度集中時，能與周圍的風向產生共鳴，微幅引導氣流偏折射來的箭矢，或在草原上傳遞遠距離的低頻訊息。",
        description: "由初代大汗坐騎的腿骨製成，笛身刻滿了古老的游牧符文。目前由觀測者保管。",
        relations: [{ targetId: "f2", type: "王權象徵" }]
      }
    ]
  },
  {
    category: "歷史事件 (Events)",
    items: [
      { 
        id: "e1", 
        name: "金帳汗國建立", 
        category: 'event',
        date: "2003-08-15", 
        location: "無盡大草原",
        description: "初代大汗統合了草原上的遊牧部落，正式建立金帳汗國，並由薩滿立下血誓。",
        relations: [{ targetId: "f2", type: "建立" }]
      },
      { 
        id: "e2", 
        name: "星象塔的凝望", 
        category: 'event',
        date: "1995-11-03", 
        location: "舊日廢墟",
        description: "觀測者首次記錄到廢墟深處傳來異常的能量波動，隨後引發了後世的大災變。",
        relations: [{ targetId: "f1", type: "觀測" }]
      }
    ]
  }
];