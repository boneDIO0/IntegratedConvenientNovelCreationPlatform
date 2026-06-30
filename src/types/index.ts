// src/types/index.ts

export type Relation = {
  targetId: string;
  type: string;
};

// 🌟 全域核心業務型別：SettingItem 結構
export type SettingItem = {
  id: string;
  name: string;
  category: 'character' | 'faction' | 'item' | 'event' | 'custom' | string;
  description?: string;
  relations?: Relation[];
  
  // 通用擴充與關係圖譜（RelationGraph）必備欄位
  color?: string; 
  location?: string;

  // 🌐 曆法軌道 A：標準時間模式
  date?: string; // 儲存西元日期 (YYYY-MM-DD)，供公式反解

  // ✍️ 曆法軌道 B：純自訂紀元模式（🌟 完美對齊拖曳架構）
  fantasyDisplay?: string; // 創作者全手動自由填寫的時間字串（例如：「元曆 150 年 暮月」）
  
  // 🌟 核心重構點：用此欄位取代舊有的 sortWeight！
  // 用來標記該事件目前「歸屬」於哪一個由 CalendarConfigForm 拖曳排定順序的紀元
  selectedEraName?: string; 

  // ----------------------------------------------------
  // 👥 人物專屬欄位 (Characters)
  // ----------------------------------------------------
  faction?: string;
  title?: string;

  // ----------------------------------------------------
  // 🏰 組織專屬欄位 (Factions)
  // ----------------------------------------------------
  leader?: string;
  territory?: string;
  hierarchy?: string[];

  // ----------------------------------------------------
  // ⚔️ 物品與技能專屬欄位 (Items & Skills)
  // ----------------------------------------------------
  itemType?: "weapon" | "artifact" | "consumable" | "skill";
  resonanceEffect?: string;

  // ----------------------------------------------------
  // ⚙️ 自由擴充欄位 (組員或寫手後續客製化欄位)
  // ----------------------------------------------------
  customFields?: { label: string; value: string }[];
};

// ----------------------------------------------------
// 🌍 全域曆法核心配置型別（對齊後端 Prisma JSONB 結構與 API 通訊協定）
// ----------------------------------------------------

export type MonthDefinition = {
  name: string;
  days: number;
};

export type EraDefinition = {
  id: string;            // 供 @dnd-kit 拖曳與 React Key 追蹤的唯一識別碼
  name: string;          // 紀元/年號名稱（如：前網智古曆、元風紀元）
  startYear?: number | null;
  endYear?: number | null;
  isRetrograde?: boolean; // 歷史逆向倒推（如西元前）
  months: MonthDefinition[]; // 12 月份精準配置
};

export type CalendarConfig = {
  // standard: 標準西元公式自動反解 | fantasy_only: 純自訂文字手動輸入（支援拖曳排序）
  mode: 'standard' | 'fantasy_only';
  eras: EraDefinition[]; // 歷史斷代切片陣列（在 fantasy_only 下，此陣列的物理 index 即為排序優先權）
};