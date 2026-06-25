// src/lib/calendarEngine.ts
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

// 🌟 重新定義與 CalendarConfigForm 完全對齊的型別結構
export interface CalendarConfig {
  eraName: string;      // 紀元名稱 (如 "廢墟紀元")
  baseYear: number;     // 西元元年對應年份 (如 2000)
  months: { name: string; days: number }[]; // 帶有天數的自訂月份物件陣列
}

// 預設月份稱謂 fallback
const DEFAULT_MONTHS = [
  '初雪之月', '寒風之月', '甦醒之月', '雷雨之月', 
  '長草之月', '烈陽之月', '旱風之月', '金葉之月', 
  '收穫之月', '枯木之月', '冰霜之月', '長夜之月'
];

/**
 * 將標準時間轉換為世界觀專屬曆法
 */
export function formatFantasyDate(isoDate: string | undefined, config?: CalendarConfig): string {
  if (!isoDate) return "未知時間";
  
  const target = dayjs(isoDate);
  if (!target.isValid()) return "時間格式錯誤";

  // 1. 讀取自訂配置，若無則降級套用預設值 (對齊表單的 eraName 與 baseYear)
  const era = config?.eraName || '廢墟紀元';
  const baseYear = config?.baseYear !== undefined ? config.baseYear : 2000;
  const configMonths = config?.months || [];

  const currentYear = target.year();
  const currentMonthIdx = target.month(); // 0-11
  const currentDay = target.date();

  // 2. 計算世界觀年份
  const worldYear = currentYear - baseYear;

  // 3. 撈取月份名稱
  const monthName = configMonths[currentMonthIdx]?.name || DEFAULT_MONTHS[currentMonthIdx] || `${currentMonthIdx + 1}月`;

  // 4. 根據年份正負判斷紀元
  if (worldYear < 0) {
    return `舊曆 ${Math.abs(worldYear)} 年 ${monthName} ${currentDay} 日`;
  } else {
    return `${era} ${worldYear + 1} 年 ${monthName} ${currentDay} 日`;
  }
}

export function getDaysBetween(date1: string, date2: string): number {
  if (!date1 || !date2) return 0;
  return Math.abs(dayjs(date1).diff(dayjs(date2), 'day'));
}