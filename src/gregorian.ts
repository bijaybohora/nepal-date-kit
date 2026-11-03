import type { DateParts } from './types.js';

const MS_PER_DAY = 86_400_000;

export function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

export function formatIsoDate(parts: DateParts): string {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function isRealGregorianDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Parse a Gregorian `YYYY-MM-DD` calendar date. Returns null when the text or the day is not real. */
export function parseIsoDate(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isRealGregorianDate(year, month, day)) return null;
  return { year, month, day };
}

function utcDayNumber(parts: DateParts): number {
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / MS_PER_DAY);
}

/** Signed day difference, `later - earlier`. */
export function diffDays(later: DateParts, earlier: DateParts): number {
  return utcDayNumber(later) - utcDayNumber(earlier);
}

export function addDays(parts: DateParts, amount: number): DateParts {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + amount));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

/** 0 Sunday through 6 Saturday, matching `Date#getDay`. */
export function weekdayOf(parts: DateParts): number {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

export function compareParts(a: DateParts, b: DateParts): -1 | 0 | 1 {
  if (a.year !== b.year) return a.year < b.year ? -1 : 1;
  if (a.month !== b.month) return a.month < b.month ? -1 : 1;
  if (a.day !== b.day) return a.day < b.day ? -1 : 1;
  return 0;
}
