// Fixed Brazilian national holidays (month 1-12, day)
const BR_FIXED_HOLIDAYS: [number, number][] = [
  [1, 1],   // Confraternização Universal
  [4, 21],  // Tiradentes
  [5, 1],   // Dia do Trabalho
  [9, 7],   // Independência
  [10, 12], // Nossa Senhora Aparecida
  [11, 2],  // Finados
  [11, 15], // Proclamação da República
  [12, 25], // Natal
];

/**
 * Computes Easter Sunday for a given year using the Anonymous Gregorian algorithm.
 * Returns a Date in UTC at midnight.
 */
export function computeEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 1-based
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function addDaysUTC(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toUTCDateString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns movable holiday dates (as "YYYY-MM-DD" UTC strings) for a given year.
 * - Carnaval: 47 days before Easter
 * - Sexta-feira Santa: 2 days before Easter
 * - Corpus Christi: 60 days after Easter
 */
function getMovableHolidays(year: number): Set<string> {
  const easter = computeEaster(year);
  return new Set([
    toUTCDateString(addDaysUTC(easter, -47)), // Carnaval
    toUTCDateString(addDaysUTC(easter, -2)),  // Sexta-feira Santa
    toUTCDateString(addDaysUTC(easter, 60)),  // Corpus Christi
  ]);
}

/** Returns true if the given date falls on Saturday or Sunday (local time). */
export function isWeekend(date: Date): boolean {
  const day = date.getDay(); // 0=Sunday, 6=Saturday
  return day === 0 || day === 6;
}

/** Returns true if the given date is a Brazilian national holiday (local time for fixed, UTC for movable). */
export function isHolidayBR(date: Date): boolean {
  const month = date.getMonth() + 1; // 1-based
  const day = date.getDate();

  for (const [hm, hd] of BR_FIXED_HOLIDAYS) {
    if (hm === month && hd === day) return true;
  }

  // Check movable holidays — compare using local date string
  const localStr = toLocalDateString(date);
  const year = date.getFullYear();
  const movable = getMovableHolidays(year);
  return movable.has(localStr);
}

/** Returns true if the given date is a workday (not weekend AND not a Brazilian holiday). */
export function isWorkday(date: Date): boolean {
  return !isWeekend(date) && !isHolidayBR(date);
}
