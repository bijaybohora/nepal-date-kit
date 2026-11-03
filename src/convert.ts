import { assertValidAd, assertValidBs, isValidAdDate, isValidBsDate } from './bounds.js';
import { getCalendarIndex } from './calendar-data.js';
import { NepalDateKitError } from './errors.js';
import { addDays, diffDays, isRealGregorianDate, weekdayOf } from './gregorian.js';
import { parseBs } from './parse.js';
import { isDateParts, type DateParts } from './types.js';

export { isValidAdDate, isValidBsDate };

export function adPartsFromDate(date: Date): DateParts {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new NepalDateKitError('INVALID_DATE', 'Expected a valid JavaScript Date.');
  }
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

/** Read an AD calendar date from `YYYY-MM-DD` or from a string `Date` can parse. */
export function parseAdInput(input: string): DateParts {
  if (typeof input !== 'string') {
    throw new NepalDateKitError('PARSE_ERROR', 'AD date text must be a string.');
  }
  const trimmed = input.trim();
  const shape = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (shape) {
    const parts = {
      year: Number(shape[1]),
      month: Number(shape[2]),
      day: Number(shape[3]),
    };
    if (!isRealGregorianDate(parts.year, parts.month, parts.day)) {
      throw new NepalDateKitError('INVALID_DATE', `AD date ${trimmed} is not a real Gregorian date.`);
    }
    return parts;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new NepalDateKitError('PARSE_ERROR', `Could not parse "${input}" as an AD date.`);
  }
  return adPartsFromDate(parsed);
}

export function bsToAd(year: number, month: number, day: number): DateParts;
export function bsToAd(input: DateParts | string): DateParts;
export function bsToAd(input: DateParts | string | number, month?: number, day?: number): DateParts {
  const parts = resolveBsInput(input, month, day);
  assertValidBs(parts);
  const index = getCalendarIndex();
  const yearInfo = index.byYear.get(parts.year);
  const monthOffset = yearInfo?.monthOffsets[parts.month - 1];
  if (!yearInfo || monthOffset === undefined) {
    throw new NepalDateKitError('OUT_OF_RANGE', `BS date is outside the supported range.`);
  }
  return addDays(index.anchorAd, yearInfo.startOffset + monthOffset + (parts.day - 1));
}

export function adToBs(year: number, month: number, day: number): DateParts;
export function adToBs(input: Date | string | DateParts): DateParts;
export function adToBs(
  input: Date | string | DateParts | number,
  month?: number,
  day?: number,
): DateParts {
  const parts = resolveAdInput(input, month, day);
  assertValidAd(parts);
  const index = getCalendarIndex();
  const offset = diffDays(parts, index.anchorAd);
  let low = 0;
  let high = index.years.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const yearInfo = index.years[mid];
    if (!yearInfo) break;
    if (offset < yearInfo.startOffset) {
      high = mid - 1;
      continue;
    }
    if (offset >= yearInfo.startOffset + yearInfo.yearLength) {
      low = mid + 1;
      continue;
    }
    let dayOfYear = offset - yearInfo.startOffset;
    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      const length = yearInfo.months[monthIndex];
      if (length === undefined) break;
      if (dayOfYear < length) {
        return { year: yearInfo.year, month: monthIndex + 1, day: dayOfYear + 1 };
      }
      dayOfYear -= length;
    }
    break;
  }
  const meta = index;
  throw new NepalDateKitError(
    'OUT_OF_RANGE',
    `AD date is outside the supported range ${meta.minAd.year} through ${meta.maxAd.year}.`,
  );
}

export function daysInBsMonth(year: number, month: number): number {
  assertValidBs({ year, month, day: 1 });
  const length = getCalendarIndex().byYear.get(year)?.months[month - 1];
  if (length === undefined) {
    throw new NepalDateKitError('INVALID_DATE', `BS month ${month} of ${year} is not in the loaded calendar.`);
  }
  return length;
}

/** Weekday of a BS date. 0 is Sunday and 6 is Saturday. */
export function weekdayOfBs(year: number, month: number, day: number): number {
  return weekdayOf(bsToAd(year, month, day));
}

export function addBsDays(parts: DateParts, amount: number): DateParts {
  assertInteger(amount, 'Days');
  assertValidBs(parts);
  return adToBs(addDays(bsToAd(parts), amount));
}

export function addBsMonths(parts: DateParts, amount: number): DateParts {
  assertInteger(amount, 'Months');
  assertValidBs(parts);
  const index = parts.year * 12 + (parts.month - 1) + amount;
  const year = Math.floor(index / 12);
  const monthIndex = index - year * 12 + 1;
  let length: number;
  try {
    length = daysInBsMonth(year, monthIndex);
  } catch (error) {
    if (error instanceof NepalDateKitError && (error.code === 'OUT_OF_RANGE' || error.code === 'INVALID_DATE')) {
      const loaded = getCalendarIndex();
      throw new NepalDateKitError(
        'OUT_OF_RANGE',
        `BS date ${year}-${String(monthIndex).padStart(2, '0')}-01 is outside the supported range ${loaded.minBs.year} through ${loaded.maxBs.year}.`,
      );
    }
    throw error;
  }
  const next = { year, month: monthIndex, day: Math.min(parts.day, length) };
  assertValidBs(next);
  return next;
}

export function addBsYears(parts: DateParts, amount: number): DateParts {
  assertInteger(amount, 'Years');
  return addBsMonths(parts, amount * 12);
}

export function diffBsDays(left: DateParts, right: DateParts): number {
  return diffDays(bsToAd(left), bsToAd(right));
}

function assertInteger(amount: number, label: string): void {
  if (!Number.isInteger(amount)) {
    throw new NepalDateKitError('INVALID_DATE', `${label} to add or subtract must be an integer.`);
  }
}

function resolveBsInput(input: DateParts | string | number, month?: number, day?: number): DateParts {
  if (typeof input === 'number') {
    if (typeof month !== 'number' || typeof day !== 'number' || !Number.isInteger(month) || !Number.isInteger(day)) {
      throw new NepalDateKitError('INVALID_DATE', 'bsToAd(year, month, day) needs three integers.');
    }
    return { year: input, month, day };
  }
  if (month !== undefined || day !== undefined) {
    throw new NepalDateKitError('INVALID_DATE', 'Pass bsToAd(year, month, day) or a single BS value.');
  }
  if (typeof input === 'string') return parseBs(input);
  if (isDateParts(input)) return { year: input.year, month: input.month, day: input.day };
  throw new NepalDateKitError('INVALID_DATE', 'BS input must be a string or { year, month, day }.');
}

function resolveAdInput(
  input: Date | string | DateParts | number,
  month?: number,
  day?: number,
): DateParts {
  if (typeof input === 'number') {
    if (typeof month !== 'number' || typeof day !== 'number' || !Number.isInteger(month) || !Number.isInteger(day)) {
      throw new NepalDateKitError('INVALID_DATE', 'adToBs(year, month, day) needs three integers.');
    }
    return { year: input, month, day };
  }
  if (month !== undefined || day !== undefined) {
    throw new NepalDateKitError('INVALID_DATE', 'Pass adToBs(year, month, day) or a single AD value.');
  }
  if (input instanceof Date) return adPartsFromDate(input);
  if (typeof input === 'string') return parseAdInput(input);
  if (isDateParts(input)) return { year: input.year, month: input.month, day: input.day };
  throw new NepalDateKitError('INVALID_DATE', 'AD input must be a Date, a string, or { year, month, day }.');
}
