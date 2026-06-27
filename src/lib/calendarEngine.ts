// src/lib/calendarEngine.ts
import dayjs from 'dayjs';

export interface CalendarConfig {
  eraName: string;
  baseYear: number;
  months: { name: string; days: number }[];
}

export function formatFantasyDate(isoDate: string | undefined, config?: CalendarConfig): string {
  if (!isoDate) return "未知時間";
  
  const target = dayjs(isoDate);
  if (!target.isValid()) return "時間格式錯誤";

  const era = config?.eraName || '廢墟紀元';
  const baseYear = config?.baseYear !== undefined ? config.baseYear : 2046;
  
  // 1. 載入自訂月份，若無則套用 12 個月、每月 30 天的標準曆
  const configMonths = config?.months && config.months.length > 0 
    ? config.months 
    : Array(12).fill(null).map((_, i) => ({ name: `${i + 1}月`, days: 30 }));

  // 計算世界觀設定中「一整年」到底有多少天 (例如你的星海曆加起來是 366 天)
  const daysInFantasyYear = configMonths.reduce((sum, m) => sum + m.days, 0);

  // 🌟 2. 計算絕對零點：大災變元年的 1 月 1 日
  const epochRoot = dayjs(`${baseYear}-01-01`);

  // 🌟 3. 計算目標日期與絕對零點相差的「絕對總天數」
  const diffAbsoluteDays = target.diff(epochRoot, 'day');

  let fantasyYear = 0;
  let remainingDays = 0;
  let isBeforeEpoch = diffAbsoluteDays < 0;

  if (!isBeforeEpoch) {
    // 🎬 【大災變後】正向推算
    fantasyYear = Math.floor(diffAbsoluteDays / daysInFantasyYear) + 1;
    // 取餘數代表是這一年的第幾天 (1-based)
    remainingDays = (diffAbsoluteDays % daysInFantasyYear) + 1;
  } else {
    // 🎬 【大災變前：舊曆】逆向推算 (數學鏡像修正)
    // 由於 diffAbsoluteDays 是負數，我們取絕對值後往前推算
    const absDiffDays = Math.abs(diffAbsoluteDays);
    // 扣除不滿一年的部分
    fantasyYear = Math.floor((absDiffDays - 1) / daysInFantasyYear) + 1;
    // 算出這一天在該舊曆年中，是倒數第幾天，進而換算成正向的「第幾天」
    remainingDays = daysInFantasyYear - ((absDiffDays - 1) % daysInFantasyYear);
  }

  // 🌟 4. 根據「該年第幾天」，依據使用者設定的月份天數精準解構
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

  // 5. 輸出完美對齊的格式
  if (isBeforeEpoch) {
    return `舊曆 ${fantasyYear} 年 ${fantasyMonthName} ${fantasyDay} 日`;
  } else {
    return `${era} ${fantasyYear} 年 ${fantasyMonthName} ${fantasyDay} 日`;
  }
}