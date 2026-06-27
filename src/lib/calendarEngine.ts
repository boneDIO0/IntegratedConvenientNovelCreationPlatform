// src/lib/calendarEngine.ts
import dayjs from 'dayjs';

// 每個獨立紀元的設定
export interface EraDefinition {
  name: string;        // 紀元名稱 (例如: "星海曆", "舊曆", "逐光紀元")
  startYear: number;   // 西元起始年份 (包含) (例如: 2046)
  endYear: number | null; // 西元結束年份 (包含)，null 代表持續至今/未來
  isRetrograde?: boolean; // 🌟 是否為「逆向倒推」的歷史 (例如舊曆越古老，年份數字越大)
  months: { name: string; days: number }[]; // 該紀元專屬的月份配置
}

// 全域曆法配置
export interface CalendarConfig {
  eras: EraDefinition[];
}

// 當資料庫全空時的 Fallback 預設多紀元配置 (也就是你舉例的設定)
const DEFAULT_MULTI_ERAS: EraDefinition[] = [
  {
    name: "B曆 (餘燼星曆)",
    startYear: 2046,
    endYear: null, // 未來無限
    months: [
      { name: "重燃之月", days: 31 }, { name: "微光之月", days: 30 },
      { name: "風暴之月", days: 31 }, { name: "極晝之月", days: 30 },
      { name: "熔煉之月", days: 31 }, { name: "輻射之月", days: 30 },
      { name: "金屬之月", days: 31 }, { name: "極光之月", days: 30 },
      { name: "收容之月", days: 31 }, { name: "凝凍之月", days: 30 },
      { name: "永夜之月", days: 31 }, { name: "餘燼之月", days: 31 }
    ]
  },
  {
    name: "A曆 (鋼鐵渡劫期)",
    startYear: 2026,
    endYear: 2045,
    months: Array(12).fill(null).map((_, i) => ({ name: `安息第${i + 1}期`, days: 30 })) // 12個月各30天
  },
  {
    name: "舊曆 (前大災變時期)",
    startYear: -Infinity, // 2026 以前的所有過去
    endYear: 2025,
    isRetrograde: true, // 越往過去年份越大
    months: Array(12).fill(null).map((_, i) => ({ name: `${i + 1}月`, days: 30 }))
  }
];

export function formatFantasyDate(isoDate: string | undefined, config?: CalendarConfig): string {
  if (!isoDate) return "未知時間";
  
  const target = dayjs(isoDate);
  if (!target.isValid()) return "時間格式錯誤";

  const currentYear = target.year();
  const eras = config?.eras && config.eras.length > 0 ? config.eras : DEFAULT_MULTI_ERAS;

  // 🌟 核心步驟 1：比對西元年份，撈出目標日期落在「哪一個歷史區間」
  const activeEra = eras.find(era => {
    const startMatch = currentYear >= era.startYear;
    const endMatch = era.endYear === null || currentYear <= era.endYear;
    return startMatch && endMatch;
  });

  if (!activeEra) return `未知紀元 (西元 ${currentYear} 年)`;

  // 🌟 核心步驟 2：以該紀元的「起始點」作為絕對零點
  // 如果是無限過去的舊曆，則以它的 endYear + 1 作為倒推起點
  const baseYearForCalc = activeEra.startYear === -Infinity ? (activeEra.endYear ?? 2025) + 1 : activeEra.startYear;
  const epochRoot = dayjs(`${baseYearForCalc}-01-01`);
  
  const diffAbsoluteDays = target.diff(epochRoot, 'day');
  const configMonths = activeEra.months;
  const daysInFantasyYear = configMonths.reduce((sum, m) => sum + m.days, 0);

  let fantasyYear = 0;
  let remainingDays = 0;
  
  // 判斷是否需要逆向倒推（如西元前、或設定中大災變前的舊曆倒數）
  const shouldRetrograde = activeEra.isRetrograde || diffAbsoluteDays < 0;

  if (!shouldRetrograde) {
    // 【正向曆法】
    fantasyYear = Math.floor(diffAbsoluteDays / daysInFantasyYear) + 1;
    remainingDays = (diffAbsoluteDays % daysInFantasyYear) + 1;
  } else {
    // 【逆向曆法】
    const absDiffDays = Math.abs(diffAbsoluteDays);
    // 修正邊界，讓靠近起點的西元日期對齊虛擬曆的年末
    const offsetDays = diffAbsoluteDays < 0 ? absDiffDays - 1 : absDiffDays;
    
    fantasyYear = Math.floor(offsetDays / daysInFantasyYear) + 1;
    remainingDays = daysInFantasyYear - (offsetDays % daysInFantasyYear);
  }

  // 🌟 核心步驟 3：依據該紀元專屬的月份天數解構日期
  let fantasyMonthName = "未知之月";
  let fantasyDay = 1;
  let scanDays = remainingDays;

  for (let i = 0; i < configMonths.length; i++) {
    const m = configMonths[i];
    if (scanDays <= m.days) {
      fantasyMonthName = m.name;
      fantasyDay = scanDays;
      break;
    }
    scanDays -= m.days;
  }

  return `${activeEra.name} ${fantasyYear} 年 ${fantasyMonthName} ${fantasyDay} 日`;
}