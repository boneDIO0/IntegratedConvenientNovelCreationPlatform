// src/types/index.ts

export type Relation = {
  targetId: string;   // 目標 SettingItem 的 id
  type: string;       // 關係類型（例如：隸屬於、宿敵、父女、建立者）
  targetName?: string;// 目標名稱（快取顯示，避免頻繁反查）
  name?: string;      // 相容欄位
  relation?: string;  // 相容欄位
};

// ----------------------------------------------------
// 🌍 全域曆法與地理核心配置型別
// ----------------------------------------------------

export type MonthDefinition = {
  name: string;
  days: number;
};

export type EraDefinition = {
  id: string;             // 供 @dnd-kit 拖曳與 React Key 追蹤的唯一識別碼
  name: string;           // 紀元/年號名稱（如：西元、新紀元、元風紀元）
  startYear?: number | null;
  endYear?: number | null;
  isRetrograde?: boolean; // 歷史逆向倒推（如西元前）
  months: MonthDefinition[]; // 月份精準配置
};

export type CalendarConfig = {
  // standard: 標準西元公式自動反解 | fantasy_only: 純自訂文字手動輸入（支援拖曳排序）
  mode: 'standard' | 'fantasy_only';
  eras: EraDefinition[]; // 歷史斷代切片陣列
};

// 🌟 地點定義型別（供全域地圖與管理功能使用）
export type LocationDefinition = {
  id: string;           // 地點唯一識別碼
  name: string;         // 地點名稱
  description?: string; // 地點的背景故事/簡介
  parentId?: string;    // 區域父級 ID（例如：冬木市、觀布子市、高雄市）
};

// 🌟 全域核心業務型別：SettingItem 結構
export type SettingItem = {
  id: string;
  projectId?: string;
  name: string;
  title?: string;       // 相容別名或標題
  category: 'character' | 'faction' | 'item' | 'event' | 'location' | 'custom' | string; 
  
  description?: string;
  relations?: Relation[];
  
  // 🌟 Prisma 資料庫 Json 封裝欄位（確保雙寫與非同步讀寫型別安全）
  content?: Record<string, any>;

  // 通用擴充與關係圖譜（RelationGraph）必備欄位
  color?: string; 

  // 🌟 地理連動雙軌制
  locationId?: string;      // 軌道 A：關聯現有地點 ID
  customLocation?: string;  // 軌道 B：寫手自由填寫的臨時字串

  // 🌐 曆法軌道 A：標準時間模式
  date?: string;            // 儲存西元日期 (YYYY-MM-DD)，供公式反解

  // ✍️ 曆法軌道 B：純自訂紀元模式
  fantasyDisplay?: string;  // 創作者全手動自由填寫的時間字串（例如：「元曆 150 年 暮月」）
  
  // 歷史排序與紀元標記
  selectedEraName?: string; 
  sortWeight?: number;

  // ----------------------------------------------------
  // 👥 人物專屬欄位 (Characters)
  // ----------------------------------------------------
  faction?: string;
  alliances?: string;       // 所屬陣營/組織
  titles?: string[];        // 稱號清單（如：["退魔一族", "淺神之女"]，利於文章選字檢索）
  aliases?: string[];       // 別名清單
  gender?: string;
  age?: string;
  identity?: string;
  appearance?: string;
  personality?: string;
  background?: string;
  abilities?: string;

  // ----------------------------------------------------
  // 🏰 組織專屬欄位 (Factions)
  // ----------------------------------------------------
  leader?: string;
  territory?: string;
  headquarters?: string;
  goals?: string;
  hierarchy?: string[];

  // ----------------------------------------------------
  // ⚔️ 物品與技能專屬欄位 (Items & Skills)
  // ----------------------------------------------------
  itemType?: "weapon" | "artifact" | "consumable" | "skill" | "custom" | string;
  resonanceEffect?: string;
  owner?: string;
  rarity?: string;
  effect?: string;

  // ----------------------------------------------------
  // 📜 歷史事件專屬欄位 (Events)
  // ----------------------------------------------------
  participants?: string[];
  impact?: string;

  // ----------------------------------------------------
  // 🌍 地點專屬欄位 (Locations)
  // ----------------------------------------------------
  parentId?: string;
  coordinates?: { x: number; y: number };
  climate?: string;         // 風土氣候設定

  // ----------------------------------------------------
  // ⚙️ 自由擴充欄位 (自訂屬性)
  // ----------------------------------------------------
  customFields?: { label: string; value: string }[];

  // 系統維護欄位
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
};

// ----------------------------------------------------
// 🔍 文章選取文字比對 API 回傳型別定義
// ----------------------------------------------------
export type MatchedSettingResult = {
  item: SettingItem;
  matchScore: number;       // 匹配相關度分數
  matchedBy: 'name' | 'title' | 'alias' | 'content';
};