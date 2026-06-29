// src/lib/calendarEngine.ts
import dayjs from 'dayjs';

export interface EraDefinition {
  name: string;        
  startYear: number;   
  endYear: number | null; 
  isRetrograde?: boolean; 
  months: { name: string; days: number }[]; 
}

export interface CalendarConfig {
  mode: 'standard' | 'fantasy_only';
  eras: EraDefinition[];
}

const DEFAULT_MULTI_ERAS: EraDefinition[] = [
  {
    name: "矽基星曆 (Silicon Era)",
    startYear: 2046,
    endYear: null,
    months: [
      { name: "冷啟動之月", days: 28 }, { name: "超頻之月", days: 28 },
      { name: "溢位之月", days: 28 }, { name: "安全碼之月", days: 28 },
      { name: "編譯之月", days: 28 }, { name: "封包之月", days: 28 },
      { name: "雲端之月", days: 28 }, { name: "迭代之月", days: 28 },
      { name: "節流之月", days: 28 }, { name: "斷網之月", days: 28 },
      { name: "黑帽之月", days: 28 }, { name: "【核心維護】餘燼長夜之月", days: 57 }
    ]
  },
  {
    name: "霓虹晚期 (Cyber Epoch)",
    startYear: 2010,
    endYear: 2045,
    months: Array(12).fill(null).map((_, i) => ({ name: `仿生${i + 1}月`, days: 30 }))
  },
  {
    name: "前網智古曆 (Pre-Net)",
    startYear: -Infinity,
    endYear: 2009,
    isRetrograde: true, 
    months: Array(12).fill(null).map((_, i) => ({ name: `蒙昧${i + 1}月`, days: 30 })) 
  }
];

/**
 * 🌟 核心救星：手動計算格里曆（西元）某年某月某日距離西元 1 年 1 月 1 日的絕對天數
 * 這樣可以完美避開 JavaScript 將 0099 年當作 1999 年的 Y2K Bug
 */
function getAbsoluteDaysFromAD1(year: number, month: number, day: number): number {
  let y = year;
  // 處理西元前 (BCE) 的簡單防呆
  if (y === -Infinity) y = -10000; 

  // 將 1月 2月 視為前一年的 13月 14月（Zeller's congruence 經典演算法變形）
  let m = month;
  if (m <= 2) {
    m += 12;
    y -= 1;
  }

  // 核心數學公式：每 4 年一閏，每 100 年不閏，每 400 年又閏
  const leapDays = Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400);
  const monthDays = Math.floor((306 * (m + 1)) / 10);
  
  return 365 * y + leapDays + monthDays + day;
}

export function formatFantasyDate(
  isoDate: string | undefined, 
  config?: CalendarConfig,
  customFantasyDisplay?: string // 🌟 新增：事件表單傳進來的「手動輸入時間字串」
): string {

  if (config?.mode === 'fantasy_only') {
    return customFantasyDisplay || "未設定自訂曆法時間";
  }
  
  if (!isoDate) return "未知時間";
  
  const target = dayjs(isoDate);
  if (!target.isValid()) return "時間格式錯誤";

  const currentYear = target.year();
  const currentMonth = target.month() + 1; // dayjs 的 month 是 0~11
  const currentDay = target.date();

  const eras = config?.eras && config.eras.length > 0 ? config.eras : DEFAULT_MULTI_ERAS;

  const activeEra = eras.find(era => {
    const startMatch = era.startYear === -Infinity || currentYear >= era.startYear;
    const endMatch = era.endYear === null || currentYear <= era.endYear;
    return startMatch && endMatch;
  });

  if (!activeEra) return `未歸類紀元 (西元 ${currentYear} 年)`;

  const configMonths = activeEra.months;
  const daysInFantasyYear = configMonths.reduce((sum, m) => sum + m.days, 0);

  let fantasyYear = 1;
  let remainingDays = 1;

  // 🌟 改用絕對數學天數差進行地圖映射，徹底消滅 0099 與 1999 的重疊現象
  const targetAbsDays = getAbsoluteDaysFromAD1(currentYear, currentMonth, currentDay);

  if (!activeEra.isRetrograde) {
    // 🎬 【正向曆法】
    const rootAbsDays = getAbsoluteDaysFromAD1(activeEra.startYear, 1, 1);
    const diffDays = targetAbsDays - rootAbsDays;
    
    fantasyYear = Math.floor(diffDays / daysInFantasyYear) + 1;
    remainingDays = (diffDays % daysInFantasyYear) + 1;
    
    if (remainingDays <= 0) {
      remainingDays += daysInFantasyYear;
      fantasyYear -= 1;
    }
  } else {
    // 🎬 【逆向曆法】
    const endAnchor = activeEra.endYear !== null ? activeEra.endYear : 2009;
    const rootAbsDays = getAbsoluteDaysFromAD1(endAnchor, 12, 31);
    
    // 因為是過去，rootAbsDays 會大於 targetAbsDays
    const diffDays = rootAbsDays - targetAbsDays;
    const absDiffDays = Math.abs(diffDays);
    
    fantasyYear = Math.floor(absDiffDays / daysInFantasyYear) + 1;
    const dayOffsetInYear = absDiffDays % daysInFantasyYear;
    remainingDays = daysInFantasyYear - dayOffsetInYear;
  }

  // 精準拆解月份與日期
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

export function getDaysBetween(date1: string, date2: string): number {
  if (!date1 || !date2) return 0;
  return Math.abs(dayjs(date1).diff(dayjs(date2), 'day'));
}