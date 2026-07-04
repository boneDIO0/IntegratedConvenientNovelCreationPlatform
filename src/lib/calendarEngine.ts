import dayjs from 'dayjs';
// 🌟 修正點 1：維持中心型別引入，並同時 export 出去，徹底解決 Vercel Build Error
import { CalendarConfig, EraDefinition } from "@/types"; 
export type { CalendarConfig, EraDefinition }; // 確保其他引用此檔的組件不會斷線

export const DEFAULT_MULTI_ERAS: EraDefinition[] = [
  {
    id: "era-standard-ce",
    name: "西元",
    startYear: 1,
    endYear: 100000,
    isRetrograde: false,
    months: [
      { name: "1月", days: 31 }, { name: "2月", days: 28 },
      { name: "3月", days: 31 }, { name: "4月", days: 30 },
      { name: "5月", days: 31 }, { name: "6月", days: 30 },
      { name: "7月", days: 31 }, { name: "8月", days: 31 },
      { name: "9月", days: 30 }, { name: "10月", days: 31 },
      { name: "11月", days: 30 }, { name: "12月", days: 31 }
    ]
  },
  {
    id: "era-standard-bce",
    name: "西元前",
    startYear: -10000,
    endYear: -1,
    isRetrograde: true, 
    months: [
      { name: "12月", days: 31 }, { name: "11月", days: 30 },
      { name: "10月", days: 31 }, { name: "9月", days: 30 },
      { name: "8月", days: 31 }, { name: "7月", days: 31 },
      { name: "6月", days: 30 }, { name: "5月", days: 31 },
      { name: "4月", days: 30 }, { name: "3月", days: 31 },
      { name: "2月", days: 28 }, { name: "1月", days: 31 }
    ]
  }
];

/**
 * 精密計算格里曆（西元）某年某月某日距離西元 1 年 1 月 1 日的絕對天數
 */
export function getAbsoluteDaysFromAD1(year: number, month: number, day: number): number {
  let y = year;
  let m = month;

  if (y === -Infinity) y = -10000; 

  if (m <= 2) {
    m += 12;
    y -= 1;
  }

  const leapDays = Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400);
  const monthDays = Math.floor((306 * (m + 1)) / 10) - 428;
  
  return 365 * y + leapDays + monthDays + day;
}

export function formatFantasyDate(
  isoDate: string | undefined, 
  config?: CalendarConfig,
  customFantasyDisplay?: string
): string {

  // 🌍 雙軌制 B 軌道：純自訂文字排序模式
  if (config?.mode === 'fantasy_only') {
    return customFantasyDisplay || "未設定自訂曆法時間";
  }
  
  if (!isoDate) return "未知時間";
  
  let currentYear: number;
  let currentMonth: number;
  let currentDay: number;

  const cleanDate = isoDate.split('T')[0]; 
  const parts = cleanDate.split('-');
  currentYear = parseInt(parts[0], 10);
  currentMonth = parseInt(parts[1], 10);
  currentDay = parseInt(parts[2], 10);

  // 🌟 核心破局點 1：利用你內建的純數學算式，計算當前西元時間距離西元 1 年 1 月 1 日的絕對天數
  // 這樣能 100% 繞過 dayjs 對 0099 年自動補完為 1999 年的世紀大毒瘤！
  const currentAbsoluteDays = getAbsoluteDaysFromAD1(currentYear, currentMonth, currentDay);

  const eras = config?.eras && config.eras.length > 0 ? config.eras : DEFAULT_MULTI_ERAS;

  const activeEra = eras.find(era => {
    const startYearSafe = era.startYear ?? -10000;
    const endYearSafe = era.endYear ?? 100000;
    return currentYear >= startYearSafe && currentYear <= endYearSafe;
  }) || eras[0];

  const configMonths = activeEra.months && activeEra.months.length > 0 ? activeEra.months : DEFAULT_MULTI_ERAS[0].months;
  const daysInFantasyYear = configMonths.reduce((sum, m) => sum + m.days, 0);

  let fantasyYear = 1;
  let fantasyMonthName = configMonths[0]?.name || "未知之月";
  let fantasyDay = 1;

  if (!activeEra.isRetrograde) {
    // 🎬 【正向曆法】
    const startYearSafe = activeEra.startYear ?? 1;
    
    // 🌟 核心破局點優化：如果是標準地球曆法，直接無損硬對齊，100% 免疫閏年 2/29 累積偏移
    if (daysInFantasyYear === 365 && (activeEra.name === "西元" || configMonths.length === 12)) {
      fantasyYear = currentYear - startYearSafe + 1;
      const safeMonthIndex = Math.min(Math.max(currentMonth - 1, 0), configMonths.length - 1);
      fantasyMonthName = configMonths[safeMonthIndex].name;
      fantasyDay = currentDay;
    } else {
      // 🚀 奇幻自訂異世界曆法（一年 360 天，完美實作你要的物理偏移演算法！）
      // 利用純數學算出起錨年份（例如新紀元元年 1 月 1 日）距離西元 1 年的絕對天數
      const rootAbsoluteDays = getAbsoluteDaysFromAD1(startYearSafe, 1, 1);
      const diffDays = currentAbsoluteDays - rootAbsoluteDays;
      
      if (diffDays >= 0) {
        fantasyYear = Math.floor(diffDays / daysInFantasyYear) + 1;
        let scanDays = (diffDays % daysInFantasyYear) + 1;
        
        // 進行月份拆解
        for (let i = 0; i < configMonths.length; i++) {
          const m = configMonths[i];
          if (scanDays <= m.days) {
            fantasyMonthName = m.name;
            fantasyDay = scanDays;
            break;
          }
          scanDays -= m.days;
        }
      }
    }
  } else {
    // 🎬 【逆向古曆】
    const endAnchor = activeEra.endYear !== null && activeEra.endYear !== undefined ? activeEra.endYear : -1;
    
    // 同理，逆向曆法的錨點也改用純數學絕對天數來進行扣減
    const rootAbsoluteDays = getAbsoluteDaysFromAD1(endAnchor, 12, 31);
    const diffDays = rootAbsoluteDays - currentAbsoluteDays;
    const absDiffDays = Math.abs(diffDays);
    
    fantasyYear = Math.floor(absDiffDays / daysInFantasyYear) + 1;
    let scanDays = daysInFantasyYear - (absDiffDays % daysInFantasyYear);

    // 進行月份拆解
    for (let i = 0; i < configMonths.length; i++) {
      const m = configMonths[i];
      if (scanDays <= m.days) {
        fantasyMonthName = m.name;
        fantasyDay = scanDays;
        break;
      }
      scanDays -= m.days;
    }
  }

  return `${activeEra.name} ${fantasyYear} 年 ${fantasyMonthName} ${fantasyDay} 日`;
}

export function getDaysBetween(date1: string, date2: string): number {
  if (!date1 || !date2) return 0;
  return Math.abs(dayjs(date1).diff(dayjs(date2), 'day'));
}

export function isLeapYearJS(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}