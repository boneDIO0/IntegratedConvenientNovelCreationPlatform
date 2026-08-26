// src/lib/mockSettings.ts

// 🌟 直接從全域型別庫引入，避免重複定義導致 TypeScript 建置報錯
import { SettingItem, Relation } from "@/types";

export type { SettingItem, Relation };

export type SettingGroup = {
  category: string;
  items: SettingItem[];
};

// 擴充 Mock Data：注入世界觀細節與雙軌制並存欄位
export const mockSettings: SettingGroup[] = [
  {
    category: "人物 (Characters)",
    items: [
      { 
        id: "c1", 
        name: "查干不花", 
        category: 'character',
        faction: "f2", 
        title: "千戶長", 
        description: "金帳汗國的勇悍將領。作戰時習慣帶著象徵家族榮耀的彎刀，性格剛烈但對汗國極度忠誠。",
        relations: [{ targetId: "c2", type: "敬畏" }, { targetId: "f2", type: "效忠" }]
      },
      { 
        id: "c2", 
        name: "薩滿長老", 
        category: 'character',
        faction: "f1", 
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
        color: "#ef4444" 
      },
      { 
        id: "f1", 
        name: "觀測者", 
        category: 'faction',
        leader: "未知",
        territory: "隱秘的星象塔",
        hierarchy: ["執行官", "記錄者", "大薩滿"],
        description: "中立且神秘的學者組織，致力於記錄歷史與回收危險的古代遺物。",
        color: "#3b82f6" 
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
    category: "地理與地點 (Locations)",
    items: [
      {
        id: "l1",
        name: "無盡大草原",
        category: 'location',
        climate: "溫帶大陸性氣候，晝夜溫差極大",
        description: "金帳汗國的主要領地，遼闊無邊的草場。",
        relations: [{ targetId: "f2", type: "所屬勢力" }]
      },
      {
        id: "l2",
        name: "舊日廢墟",
        category: 'location',
        climate: "常年籠罩在奇異的微光與霧氣中",
        description: "大災變前的文明遺蹟，隱藏著星象塔與無數未解謎團。",
        relations: [{ targetId: "f1", type: "據點所在地" }]
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
        locationId: "l1",
        customLocation: "無盡大草原",
        selectedEraName: "新紀元",
        fantasyDisplay: "12 年 蒙昧8月 15 日",
        description: "初代大汗統合了草原上的遊牧部落，正式建立金帳汗國，並由薩滿立下血誓。",
        relations: [{ targetId: "f2", type: "建立" }]
      },
      { 
        id: "e2", 
        name: "星象塔的凝望", 
        category: 'event',
        date: "1995-11-03", 
        locationId: "l2",
        customLocation: "舊日廢墟",
        selectedEraName: "前網智古曆",
        fantasyDisplay: "4 年 蒙昧11月 3 日",
        sortWeight: 1,
        description: "觀測者首次記錄到廢墟深處傳來異常的能量波動，隨後引發了後世的大災變。",
        relations: [{ targetId: "f1", type: "觀測" }]
      }
    ]
  }
];