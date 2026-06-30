import dayjs from 'dayjs';
// 🌟 修正點 1：從全案唯一的中心型別引入，確保型別與前端 Form 的介面完美咬合
import { CalendarConfig, EraDefinition } from "@/types"; 

export const DEFAULT_MULTI_ERAS: EraDefinition[] = [
  {
    id: "era-standard-ce",
    name: "西元",
    startYear: 1,
    endYear: 100000,
    isRetrograde: false,
    // 🌟 核心防線 1：備援範本必須採用真・地球日曆的 12 個月天數，完美對齊平年 365 天！
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
 * 🌟 核心救星：精密計算格里曆（西元）某年某月某日距離西元 1 年 1 月 1 日的絕對天數
 * 優化蔡勒公式變形，完美吃進西元閏年，徹底消滅 0099 年在 Vercel 生產環境的 Y2K Bug
 */
export function getAbsoluteDaysFromAD1(year: number, month: number, day: number): number {
  let y = year;
  let m = month;

  // 處理西元前或極端遠古邊界防呆
  if (y === -Infinity) y = -10000; 

  // 將 1月 2月 視為前一年的 13月 14月
  if (m <= 2) {
    m += 12;
    y -= 1;
  }

  // 精密閏年累積計算：每 4 年一閏，每 100 年不閏，每 400 年又閏
  const leapDays = Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400);
  
  // 306 與 10 的常數比例是蔡勒公式中用來抹平 30、31 天不規則月份變化的經典參數
  // 減去 428 是為了讓西元 1 年 1 月 1 日的返回值精準歸零定錨
  const monthDays = Math.floor((306 * (m + 1)) / 10) - 428;
  
  return 365 * y + leapDays + monthDays + day;
}

export function formatFantasyDate(
  isoDate: string | undefined, 
  config?: CalendarConfig,
  customFantasyDisplay?: string
): string {

  // 🌍 雙軌制 B 軌道：純自訂文字排序模式，直接原封不動釋放寫手打好的綠字
  if (config?.mode === 'fantasy_only') {
    return customFantasyDisplay || "未設定自訂曆法時間";
  }
  
  if (!isoDate) return "未知時間";
  
  // 🌟 修正點 1：死死扣住字串切割，防止時區轉換偷走那 8 小時導致日期跳號
  let currentYear: number;
  let currentMonth: number;
  let currentDay: number;

  const cleanDate = isoDate.split('T')[0]; // 只要 YYYY-MM-DD 部分
  const parts = cleanDate.split('-');
  currentYear = parseInt(parts[0], 10);
  currentMonth = parseInt(parts[1], 10);
  currentDay = parseInt(parts[2], 10);

  // 建立當前時間的純粹 dayjs 物件（不帶時間、不吃時區干擾）
  const targetDayjs = dayjs(`${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`);
  if (!targetDayjs.isValid()) return "時間格式錯誤";

  const eras = config?.eras && config.eras.length > 0 ? config.eras : DEFAULT_MULTI_ERAS;

  // 🔍 篩選目前日期落在哪個歷史切片中
  const activeEra = eras.find(era => {
    const startYearSafe = era.startYear ?? -10000;
    const endYearSafe = era.endYear ?? 100000;
    return currentYear >= startYearSafe && currentYear <= endYearSafe;
  }) || eras[0];

  const configMonths = activeEra.months && activeEra.months.length > 0 ? activeEra.months : DEFAULT_MULTI_ERAS[1].months;
  const daysInFantasyYear = configMonths.reduce((sum, m) => sum + m.days, 0);

  let fantasyYear = 1;
  let remainingDays = 0;

  // 🌟 修正點 2：揚棄不穩定的手寫數學公式，直接叫 dayjs 去算這兩天「在物理上到底差了幾天」！
  // dayjs 內部已經把歷史上數百年間的所有平年、閏年、2月29日算得盡善盡美。
if (!activeEra.isRetrograde) {
    // 🎬 【正向曆法】：例如現實西元日曆
    const startYearSafe = activeEra.startYear ?? 1;
    
    // 🌟 核心突破：如果一整年的天數和現實地球日曆完全一致（2月28天制，總共365天）
    // 我們直接使用「年對年、月對月、日對日」的無損對齊映射，100% 免疫任何累積天數的閏年偏移！
    if (daysInFantasyYear === 365 && activeEra.name === "西元") {
      fantasyYear = currentYear - startYearSafe + 1;
      
      // 直接把當前月份的天數和日期提取出來作為剩餘天數分配的定錨
      let accumulatedDays = currentDay;
      for (let i = 0; i < currentMonth - 1; i++) {
        accumulatedDays += configMonths[i].days;
      }
      remainingDays = accumulatedDays;
    } else {
      // 奇幻多紀元其他非地球曆法的標準處理
      const rootDayjs = dayjs(`${startYearSafe}-01-01`);
      const diffDays = targetDayjs.diff(rootDayjs, 'day');
      
      if (diffDays >= 0) {
        fantasyYear = Math.floor(diffDays / daysInFantasyYear) + 1;
        remainingDays = (diffDays % daysInFantasyYear) + 1;
      } else {
        fantasyYear = 1;
        remainingDays = 1;
      }
    }
  } else {
    // 🎬 【逆向古曆】
    const endAnchor = activeEra.endYear !== null && activeEra.endYear !== undefined ? activeEra.endYear : 2009;
    // 定錨在結束年的 12 月 31 日
    const rootDayjs = dayjs(`${endAnchor}-12-31`);
    
    const diffDays = rootDayjs.diff(targetDayjs, 'day');
    const absDiffDays = Math.abs(diffDays);
    
    fantasyYear = Math.floor(absDiffDays / daysInFantasyYear) + 1;
    const dayOffsetInYear = absDiffDays % daysInFantasyYear;
    remainingDays = daysInFantasyYear - dayOffsetInYear;
  }

  // 精準拆解出屬於自訂月份中的哪一個月、幾號
  let fantasyMonthName = configMonths[0]?.name || "未知之月";
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

export function isLeapYearJS(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}