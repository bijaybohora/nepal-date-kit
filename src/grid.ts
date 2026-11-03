import { isValidBsDate } from './bounds.js';
import { adPartsFromDate, adToBs, addBsDays, bsToAd, daysInBsMonth } from './convert.js';
import { NepalDateKitError } from './errors.js';
import { formatIsoDate, weekdayOf } from './gregorian.js';
import { parseBs } from './parse.js';
import { isDateParts, type DateParts } from './types.js';

export interface CalendarGridCell<T = unknown> {
  /** BS date shown in this cell, or null when that day is outside the loaded range. */
  bs: DateParts | null;
  /** Matching AD date, or null when `bs` is null. */
  ad: DateParts | null;
  /** 0 Sunday through 6 Saturday. */
  weekday: number;
  isToday: boolean;
  /** True when the cell belongs to the requested month. */
  inMonth: boolean;
  /** False for padding cells that fall outside the loaded BS range. */
  inRange: boolean;
  /** External data supplied with `events` or `attachEvents`. Never bundled. */
  events: T[];
}

export interface CalendarGrid<T = unknown> {
  year: number;
  month: number;
  weekStartsOn: number;
  daysInMonth: number;
  weeks: CalendarGridCell<T>[][];
}

export interface CalendarEvent<T> {
  /** BS date of the event. */
  date: DateParts | string;
  data: T;
}

export interface MonthGridCellInfo {
  bs: DateParts;
  ad: DateParts;
  weekday: number;
  isToday: boolean;
  inMonth: boolean;
}

export interface MonthGridOptions<T> {
  /** 0 Sunday (default) through 6 Saturday. */
  weekStartsOn?: number;
  /**
   * Date used for `isToday`. A `Date` is Gregorian. A string or `{ year, month, day }` is BS.
   * Defaults to the current local date.
   */
  today?: Date | string | DateParts | { toBS: () => DateParts };
  /** Events matched onto cells by BS date. */
  events?: readonly CalendarEvent<T>[];
  /** Called for each in-range cell so a UI can attach its own data. */
  attachEvents?: (cell: MonthGridCellInfo) => readonly T[] | undefined;
}

function resolveToday(today: MonthGridOptions<unknown>['today']): DateParts | null {
  if (today === undefined) {
    try {
      return adToBs(adPartsFromDate(new Date()));
    } catch (error) {
      if (error instanceof NepalDateKitError && error.code === 'OUT_OF_RANGE') return null;
      throw error;
    }
  }
  if (typeof today === 'string') return parseBs(today);
  if (today instanceof Date) return adToBs(adPartsFromDate(today));
  if (typeof today === 'object' && today !== null && 'toBS' in today && typeof today.toBS === 'function') {
    const parts = today.toBS();
    return { year: parts.year, month: parts.month, day: parts.day };
  }
  if (isDateParts(today)) {
    if (!isValidBsDate(today.year, today.month, today.day)) {
      throw new NepalDateKitError('INVALID_DATE', 'today is not a valid BS date in the loaded range.');
    }
    return { year: today.year, month: today.month, day: today.day };
  }
  throw new NepalDateKitError('INVALID_DATE', 'today must be a Date, a BS string, or { year, month, day }.');
}

function sameDay(left: DateParts | null, right: DateParts | null): boolean {
  return (
    left !== null &&
    right !== null &&
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day
  );
}

/**
 * A month laid out in weeks for any UI to render.
 * Weeks start on Sunday unless `weekStartsOn` says otherwise.
 * Leading and trailing cells from the neighbouring months are included.
 * Cells before BS 2000 or after the loaded range have `inRange: false`.
 */
export function getMonthGrid<T = unknown>(
  year: number,
  month: number,
  options?: MonthGridOptions<T>,
): CalendarGrid<T> {
  const weekStartsOn = options?.weekStartsOn ?? 0;
  if (!Number.isInteger(weekStartsOn) || weekStartsOn < 0 || weekStartsOn > 6) {
    throw new NepalDateKitError(
      'INVALID_DATE',
      'weekStartsOn must be an integer from 0 (Sunday) through 6 (Saturday).',
    );
  }
  const dim = daysInBsMonth(year, month);
  const first = { year, month, day: 1 };
  const leading = (weekdayOf(bsToAd(first)) - weekStartsOn + 7) % 7;
  const total = leading + dim;
  const trailing = (7 - (total % 7)) % 7;
  const count = total + trailing;
  const today = resolveToday(options?.today);

  const eventMap = new Map<string, T[]>();
  for (const event of options?.events ?? []) {
    const parts = typeof event.date === 'string' ? parseBs(event.date) : event.date;
    if (!isDateParts(parts) || !isValidBsDate(parts.year, parts.month, parts.day)) {
      throw new NepalDateKitError('INVALID_DATE', 'Each event date must be a BS date in the loaded range.');
    }
    const key = formatIsoDate(parts);
    const list = eventMap.get(key);
    if (list) list.push(event.data);
    else eventMap.set(key, [event.data]);
  }

  const cells: CalendarGridCell<T>[] = [];
  for (let index = 0; index < count; index += 1) {
    const offset = index - leading;
    const cellWeekday = (weekStartsOn + index) % 7;
    let bs: DateParts | null = null;
    if (offset >= 0 && offset < dim) {
      bs = { year, month, day: offset + 1 };
    } else {
      try {
        bs = addBsDays(first, offset);
      } catch (error) {
        if (error instanceof NepalDateKitError && error.code === 'OUT_OF_RANGE') bs = null;
        else throw error;
      }
    }
    if (!bs) {
      cells.push({
        bs: null,
        ad: null,
        weekday: cellWeekday,
        isToday: false,
        inMonth: false,
        inRange: false,
        events: [],
      });
      continue;
    }
    const ad = bsToAd(bs);
    const inMonth = bs.month === month && bs.year === year;
    const isToday = sameDay(bs, today);
    const events = [...(eventMap.get(formatIsoDate(bs)) ?? [])];
    if (options?.attachEvents) {
      const extra = options.attachEvents({ bs, ad, weekday: cellWeekday, isToday, inMonth });
      if (extra) events.push(...extra);
    }
    cells.push({ bs, ad, weekday: cellWeekday, isToday, inMonth, inRange: true, events });
  }

  const weeks: CalendarGridCell<T>[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return { year, month, weekStartsOn, daysInMonth: dim, weeks };
}
