// src/lib/calendarEngine.ts
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

// 載入插件
dayjs.extend(isBetween);

// 🌟 設定世界觀的「絕對零點」：大災變發生的日子
const EPOCH_DATE = dayjs('2000-01-01');

// 🌟 自訂游牧風格的月份名稱
const FANTASY_MONTHS = [
  '初雪之月', '寒風之月', '甦醒之月', '雷雨之月', 
  '長草之月', '烈陽之月', '旱風之月', '金葉之月', 
  '收穫之月', '枯木之月', '冰霜之月', '長夜之月'
];

/**
 * 將標準時間轉換為世界觀專屬曆法
 * @param isoDate 標準 ISO 格式時間 (如 "2005-04-15")
 */
export function formatFantasyDate(isoDate: string | undefined): string {
  if (!isoDate) return "未知時間";
  
  const target = dayjs(isoDate);
  const diffYears = target.diff(EPOCH_DATE, 'year');
  
  // 計算月份 (Day.js 的 month() 是從 0 開始的，剛好對應陣列)
  const monthName = FANTASY_MONTHS[target.month()];
  const day = target.date();

  // 判斷是災變前還是災變後
  if (target.isBefore(EPOCH_DATE)) {
    // 舊曆 (往回推算)
    return `舊曆 ${Math.abs(diffYears)} 年 ${monthName} ${day} 日`;
  } else {
    // 廢墟紀元
    return `廢墟紀元 ${diffYears + 1} 年 ${monthName} ${day} 日`;
  }
}

/**
 * (預留功能) 計算兩個歷史事件相差幾天
 */
export function getDaysBetween(date1: string, date2: string): number {
  return Math.abs(dayjs(date1).diff(dayjs(date2), 'day'));
}