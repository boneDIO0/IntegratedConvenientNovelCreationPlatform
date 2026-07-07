// src/types/index.ts

export type Relation = {
  targetId: string; // 目標 SettingItem 的 id
  type: string;     // 關係類型（例如：隸屬於、宿敵、父女、建立者）
};

// ----------------------------------------------------
// 🌍 全域曆法與地理核心配置型別
// ----------------------------------------------------

export type MonthDefinition = {
  name: string;
  days: number;
};

export type EraDefinition = {
  id: string;            // 供 @dnd-kit 拖曳與 React Key 追蹤的唯一識別碼
  name: string;          // 紀元/年號名稱（如：西元、新紀元、元風紀元）
  startYear?: number | null;
  endYear?: number | null;
  isRetrograde?: boolean; // 歷史逆向倒推（如西元前）
  months: MonthDefinition[]; // 月份精準配置
};

export type CalendarConfig = {
  // standard: 標準西元公式自動反解 | fantasy_only: 純自訂文字手動輸入（支援拖曳排序）
  mode: 'standard' | 'fantasy_only';
  eras: EraDefinition[]; // 歷史斷代切片陣列（在 fantasy_only 下，此陣列的物理 index 即為排序優先權）
};

// 🌟 修正點 1：新增獨立的「地點定義」型別
// 讓世界觀設定有統一的地理主體（例如清邁、高雄車站），方便建立「地理管理功能」
export type LocationDefinition = {
  id: string;          // 地點唯一識別碼
  name: string;        // 地點名稱
  description?: string; // 地點的背景故事/簡介
  parentId?: string;   // 區域父級 ID（可選，例如：高雄車站的 parent 是 高雄市，供擴充樹狀地圖）
};

// 🌟 全域核心業務型別：SettingItem 結構
export type SettingItem = {
  id: string;
  name: string;
  category: 'character' | 'faction' | 'item' | 'event' | 'location' | 'custom' | string; 
  // ☝️ 修正點 2：在 category 的字串字面值聯集（Union Types）中加入 'location'，確保型別安全！
  
  description?: string;
  relations?: Relation[];
  
  // 通用擴充與關係圖譜（RelationGraph）必備欄位
  color?: string; 

  // 🌟 修正點 3：地理連動雙軌制
  // 為了徹底滿足你提出的「地點表單」需求，建議設計成與曆法一樣的雙軌制：
  locationId?: string;      // 軌道 A：關聯到系統現有地點（LocationDefinition）的 ID，利於做「按地點篩選事件」的功能
  customLocation?: string;  // 軌道 B：允許寫手全手動自由填寫臨時地點字串（免去先建地點的麻煩）

  // 🌐 曆法軌道 A：標準時間模式
  date?: string; // 儲存西元日期 (YYYY-MM-DD)，供公式反解

  // ✍️ 曆法軌道 B：純自訂紀元模式（🌟 完美對齊拖曳架構）
  fantasyDisplay?: string; // 創作者全手動自由填寫的時間字串（例如：「元曆 150 年 暮月」）
  
  // 🌟 核心重構點：用此欄位取代舊有的 sortWeight！
  // 用來標記該事件目前「歸屬」於哪一個由 CalendarConfigForm 拖曳排定順序的紀元
  selectedEraName?: string; 
  sortWeight?: number;

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
  // 🌍 地點專屬欄位 (Locations) - 🌟 修正點 4：新增
  // ----------------------------------------------------
  // 當 category === 'location' 時，可使用以下專屬屬性
  coordinates?: { x: number; y: number }; // 未來若需要對齊大地圖系統
  climate?: string;                       // 風土氣候設定（例：常年下雪）

  // ----------------------------------------------------
  // ⚙️ 自由擴充欄位 (組員或寫手後續客製化欄位)
  // ----------------------------------------------------
  customFields?: { label: string; value: string }[];
};