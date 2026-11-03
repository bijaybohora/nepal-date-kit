import rawCalendar from '../data/bs-month-lengths.json';
import { NepalDateKitError } from './errors.js';
import { addDays, formatIsoDate, parseIsoDate } from './gregorian.js';
import type { DateParts } from './types.js';

/** Discriminator required on every calendar data document. */
export const CALENDAR_DATA_FORMAT = 'nepal-date-kit/calendar-data' as const;

export interface CalendarYear {
  /** Day counts for Baishakh through Chaitra. Each value is 29–32. */
  months: number[];
  /** Gregorian date of 1 Baishakh, as `YYYY-MM-DD`. */
  adStartOfYear: string;
}

/**
 * Runtime calendar table. Month lengths and AD anchors only.
 * Holiday, festival, tithi, and event fields are rejected.
 */
export interface CalendarData {
  format: typeof CALENDAR_DATA_FORMAT;
  version: 1;
  source?: string;
  /**
   * BS calendar date of the first supported day (`YYYY-01-01` of the earliest year)
   * and the matching Gregorian date.
   */
  anchor: { bs: string; ad: string };
  /** Last BS year whose month lengths have been checked. Later years still convert. */
  verifiedThrough: number;
  /** Human-readable note for years after `verifiedThrough`. */
  unverifiedYears?: string;
  /** Keys are BS years. Years must be contiguous. */
  years: Record<string, CalendarYear>;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  data?: CalendarData;
}

export interface CalendarMeta {
  format: typeof CALENDAR_DATA_FORMAT;
  version: 1;
  source?: string;
  unverifiedYears?: string;
  anchor: { bs: string; ad: string };
  verifiedThrough: number;
  minBs: DateParts;
  maxBs: DateParts;
  minAd: DateParts;
  maxAd: DateParts;
  yearCount: number;
}

export interface DateAccuracy {
  verified: boolean;
  verifiedThrough: number;
  /** Set when the year is inside the loaded range but after `verifiedThrough`. */
  warning: string | null;
}

export interface LoadCalendarDataOptions {
  /**
   * `merge` (default) overlays years onto the data that is already active.
   * `replace` discards the active table and uses only the supplied document.
   */
  mode?: 'merge' | 'replace';
}

interface IndexedYear {
  year: number;
  months: readonly number[];
  /** Prefix sums. Index 0 is 0 and index 12 is the number of days in the year. */
  monthOffsets: readonly number[];
  /** Days from the anchor AD date to 1 Baishakh. */
  startOffset: number;
  yearLength: number;
}

export interface CalendarIndex {
  data: CalendarData;
  years: readonly IndexedYear[];
  byYear: ReadonlyMap<number, IndexedYear>;
  anchorAd: DateParts;
  minBs: DateParts;
  maxBs: DateParts;
  minAd: DateParts;
  maxAd: DateParts;
  totalDays: number;
  verifiedThrough: number;
  unverifiedYears?: string;
  source?: string;
}

const ROOT_KEYS = new Set([
  'format',
  'version',
  'source',
  'anchor',
  'verifiedThrough',
  'unverifiedYears',
  'years',
]);

function pushError(errors: string[], message: string): void {
  if (errors.length < 40) errors.push(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function cloneCalendarData(data: CalendarData): CalendarData {
  const years: Record<string, CalendarYear> = {};
  for (const [year, info] of Object.entries(data.years)) {
    years[year] = { months: [...info.months], adStartOfYear: info.adStartOfYear };
  }
  const clone: CalendarData = {
    format: CALENDAR_DATA_FORMAT,
    version: 1,
    anchor: { bs: data.anchor.bs, ad: data.anchor.ad },
    verifiedThrough: data.verifiedThrough,
    years,
  };
  if (data.source !== undefined) clone.source = data.source;
  if (data.unverifiedYears !== undefined) clone.unverifiedYears = data.unverifiedYears;
  return clone;
}

/**
 * Check a calendar document against the package schema and the BS chain rules
 * (contiguous years, real AD anchors, each year starting the day after the previous one ends).
 * Does not change the active calendar.
 */
export function validateCalendarData(input: unknown): ValidationResult {
  const errors: string[] = [];
  let value = input;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return { ok: false, errors: ['Calendar data string is not valid JSON.'] };
    }
  }

  if (!isRecord(value)) {
    return { ok: false, errors: ['Calendar data must be a JSON object.'] };
  }

  for (const key of Object.keys(value)) {
    if (!ROOT_KEYS.has(key)) {
      pushError(
        errors,
        `Unknown property "${key}". Calendar data stores month lengths and AD anchors only.`,
      );
    }
  }

  if (value.format !== CALENDAR_DATA_FORMAT) {
    pushError(errors, `"format" must be "${CALENDAR_DATA_FORMAT}".`);
  }
  if (value.version !== 1) pushError(errors, '"version" must be 1.');
  if (value.source !== undefined && typeof value.source !== 'string') {
    pushError(errors, '"source" must be a string.');
  }
  if (value.unverifiedYears !== undefined && typeof value.unverifiedYears !== 'string') {
    pushError(errors, '"unverifiedYears" must be a string.');
  }

  let anchorBs: string | null = null;
  let anchorAd = '';
  if (!isRecord(value.anchor)) {
    pushError(errors, '"anchor" must be an object with "bs" and "ad" dates.');
  } else {
    for (const key of Object.keys(value.anchor)) {
      if (key !== 'bs' && key !== 'ad') pushError(errors, `Unknown anchor property "${key}".`);
    }
    if (typeof value.anchor.bs !== 'string' || !/^[1-9]\d{3}-01-01$/.test(value.anchor.bs)) {
      pushError(errors, '"anchor.bs" must be the first day of a BS year, formatted YYYY-01-01.');
    } else {
      anchorBs = value.anchor.bs;
    }
    if (typeof value.anchor.ad !== 'string' || !parseIsoDate(value.anchor.ad)) {
      pushError(errors, '"anchor.ad" must be a real Gregorian date formatted YYYY-MM-DD.');
    } else {
      anchorAd = value.anchor.ad;
    }
  }

  const years: Record<string, CalendarYear> = {};
  const yearNumbers: number[] = [];
  if (!isRecord(value.years) || Object.keys(value.years).length === 0) {
    pushError(errors, '"years" must be an object with at least one BS year.');
  } else {
    for (const [key, rawYear] of Object.entries(value.years)) {
      if (!/^[1-9]\d{3}$/.test(key)) {
        pushError(errors, `Year key "${key}" must be a four-digit BS year.`);
        continue;
      }
      if (!isRecord(rawYear)) {
        pushError(errors, `Year ${key} must be an object with "months" and "adStartOfYear".`);
        continue;
      }
      for (const yearKey of Object.keys(rawYear)) {
        if (yearKey !== 'months' && yearKey !== 'adStartOfYear') {
          pushError(
            errors,
            `Year ${key} has unknown property "${yearKey}". Only month lengths and adStartOfYear are stored.`,
          );
        }
      }
      const months = rawYear.months;
      if (!Array.isArray(months) || months.length !== 12) {
        pushError(errors, `Year ${key} must list exactly 12 month lengths (Baishakh through Chaitra).`);
      } else {
        months.forEach((length, index) => {
          if (!Number.isInteger(length) || length < 29 || length > 32) {
            pushError(
              errors,
              `Year ${key} month ${index + 1} must be an integer from 29 through 32.`,
            );
          }
        });
      }
      const adStart = rawYear.adStartOfYear;
      if (typeof adStart !== 'string' || !parseIsoDate(adStart)) {
        pushError(errors, `Year ${key} adStartOfYear must be a real Gregorian date formatted YYYY-MM-DD.`);
      }
      if (
        Array.isArray(months) &&
        months.length === 12 &&
        months.every((length) => Number.isInteger(length) && length >= 29 && length <= 32) &&
        typeof adStart === 'string' &&
        parseIsoDate(adStart)
      ) {
        years[key] = { months: months.map((length) => Number(length)), adStartOfYear: adStart };
        yearNumbers.push(Number(key));
      }
    }
  }

  yearNumbers.sort((a, b) => a - b);
  for (let index = 1; index < yearNumbers.length; index += 1) {
    const current = yearNumbers[index];
    const previous = yearNumbers[index - 1];
    if (current === undefined || previous === undefined) continue;
    if (current !== previous + 1) {
      pushError(errors, `Years must be contiguous. Missing BS ${previous + 1} before ${current}.`);
    }
  }

  if (yearNumbers.length > 0) {
    let expectedStart: DateParts | null = null;
    for (const year of yearNumbers) {
      const info = years[String(year)];
      if (!info) continue;
      const start = parseIsoDate(info.adStartOfYear);
      if (!start) continue;
      if (expectedStart && formatIsoDate(start) !== formatIsoDate(expectedStart)) {
        pushError(
          errors,
          `Year ${year} adStartOfYear is ${info.adStartOfYear}, but the previous year ends the day before ${formatIsoDate(expectedStart)}.`,
        );
      }
      expectedStart = addDays(start, info.months.reduce((sum, length) => sum + length, 0));
    }

    const minYear = yearNumbers[0];
    if (minYear !== undefined) {
      const expectedAnchor = `${minYear}-01-01`;
      if (anchorBs && anchorBs !== expectedAnchor) {
        pushError(errors, `"anchor.bs" must be ${expectedAnchor}, the first day of the earliest year.`);
      }
      const first = years[String(minYear)];
      if (anchorAd && first && anchorAd !== first.adStartOfYear) {
        pushError(
          errors,
          `"anchor.ad" must be ${first.adStartOfYear}, the same Gregorian day as ${minYear} adStartOfYear.`,
        );
      }
    }
  }

  if (!Number.isInteger(value.verifiedThrough)) {
    pushError(errors, '"verifiedThrough" must be an integer BS year that exists in "years".');
  } else if (!years[String(value.verifiedThrough)]) {
    pushError(
      errors,
      `"verifiedThrough" ${String(value.verifiedThrough)} is not one of the years in this document.`,
    );
  }

  if (errors.length > 0 || !anchorBs || yearNumbers.length === 0) {
    return { ok: false, errors };
  }

  const data: CalendarData = {
    format: CALENDAR_DATA_FORMAT,
    version: 1,
    anchor: { bs: anchorBs, ad: anchorAd },
    verifiedThrough: Number(value.verifiedThrough),
    years,
  };
  if (typeof value.source === 'string') data.source = value.source;
  if (typeof value.unverifiedYears === 'string') data.unverifiedYears = value.unverifiedYears;
  return { ok: true, errors: [], data };
}

function mergeCalendarData(base: CalendarData, incoming: CalendarData): CalendarData {
  const years: Record<string, CalendarYear> = {};
  for (const [year, info] of Object.entries(base.years)) {
    years[year] = { months: [...info.months], adStartOfYear: info.adStartOfYear };
  }
  for (const [year, info] of Object.entries(incoming.years)) {
    years[year] = { months: [...info.months], adStartOfYear: info.adStartOfYear };
  }
  const minYear = Math.min(...Object.keys(years).map(Number));
  const first = years[String(minYear)];
  if (!first) {
    throw new NepalDateKitError('INVALID_DATA', 'Merged calendar data has no years.');
  }
  const merged: CalendarData = {
    format: CALENDAR_DATA_FORMAT,
    version: 1,
    anchor: { bs: `${minYear}-01-01`, ad: first.adStartOfYear },
    verifiedThrough: mergedVerifiedThrough(base, incoming),
    years,
  };
  if (incoming.source !== undefined) merged.source = incoming.source;
  else if (base.source !== undefined) merged.source = base.source;
  if (incoming.unverifiedYears !== undefined) merged.unverifiedYears = incoming.unverifiedYears;
  else if (base.unverifiedYears !== undefined) merged.unverifiedYears = base.unverifiedYears;
  return merged;
}

/**
 * A supplemental file must not mark a later year verified unless it also
 * supplies every year between the current watermark and that year.
 * Adding BS 2101 on its own leaves the built-in watermark (2086) in place.
 */
function mergedVerifiedThrough(base: CalendarData, incoming: CalendarData): number {
  if (incoming.verifiedThrough <= base.verifiedThrough) return base.verifiedThrough;
  for (let year = base.verifiedThrough + 1; year <= incoming.verifiedThrough; year += 1) {
    if (!incoming.years[String(year)]) return base.verifiedThrough;
  }
  return incoming.verifiedThrough;
}

function formatDataErrors(errors: string[]): string {
  return `Calendar data is invalid:\n- ${errors.join('\n- ')}`;
}

function requireValid(input: unknown): CalendarData {
  const result = validateCalendarData(input);
  if (!result.ok || !result.data) {
    throw new NepalDateKitError('INVALID_DATA', formatDataErrors(result.errors));
  }
  return result.data;
}

export function buildCalendarIndex(data: CalendarData): CalendarIndex {
  const yearNumbers = Object.keys(data.years)
    .map(Number)
    .sort((a, b) => a - b);
  const anchorAd = parseIsoDate(data.anchor.ad);
  const firstYear = yearNumbers[0];
  const lastYearNumber = yearNumbers[yearNumbers.length - 1];
  if (!anchorAd || firstYear === undefined || lastYearNumber === undefined) {
    throw new NepalDateKitError('INVALID_DATA', 'Calendar data is missing its anchor.');
  }

  const years: IndexedYear[] = [];
  let offset = 0;
  for (const year of yearNumbers) {
    const info = data.years[String(year)];
    if (!info) continue;
    const monthOffsets: number[] = [0];
    let running = 0;
    for (const length of info.months) {
      running += length;
      monthOffsets.push(running);
    }
    years.push({
      year,
      months: info.months,
      monthOffsets,
      startOffset: offset,
      yearLength: running,
    });
    offset += running;
  }

  const last = years[years.length - 1];
  if (!last) throw new NepalDateKitError('INVALID_DATA', 'Calendar data has no years.');
  const lastMonthLength = last.months[11];
  if (lastMonthLength === undefined) {
    throw new NepalDateKitError('INVALID_DATA', 'Calendar data is missing Chaitra.');
  }

  return {
    data,
    years,
    byYear: new Map(years.map((year) => [year.year, year])),
    anchorAd,
    minBs: { year: firstYear, month: 1, day: 1 },
    maxBs: { year: last.year, month: 12, day: lastMonthLength },
    minAd: anchorAd,
    maxAd: addDays(anchorAd, offset - 1),
    totalDays: offset,
    verifiedThrough: data.verifiedThrough,
    ...(data.unverifiedYears !== undefined ? { unverifiedYears: data.unverifiedYears } : {}),
    ...(data.source !== undefined ? { source: data.source } : {}),
  };
}

const builtinResult = validateCalendarData(rawCalendar);
if (!builtinResult.ok || !builtinResult.data) {
  throw new Error(`Built-in calendar data is invalid: ${builtinResult.errors.join('; ')}`);
}

const builtinData: CalendarData = builtinResult.data;
let activeData: CalendarData = cloneCalendarData(builtinData);
let activeIndex: CalendarIndex | null = null;

export function getCalendarIndex(): CalendarIndex {
  if (!activeIndex) activeIndex = buildCalendarIndex(activeData);
  return activeIndex;
}

/** Active calendar document, cloned so callers cannot change conversion. */
export function getCalendarData(): CalendarData {
  return cloneCalendarData(activeData);
}

/** The month lengths shipped with the package, ignoring any runtime load. */
export function getBuiltinCalendarData(): CalendarData {
  return cloneCalendarData(builtinData);
}

export function getCalendarMeta(): CalendarMeta {
  const index = getCalendarIndex();
  return {
    format: CALENDAR_DATA_FORMAT,
    version: 1,
    ...(index.source !== undefined ? { source: index.source } : {}),
    ...(index.unverifiedYears !== undefined ? { unverifiedYears: index.unverifiedYears } : {}),
    anchor: { bs: index.data.anchor.bs, ad: index.data.anchor.ad },
    verifiedThrough: index.verifiedThrough,
    minBs: index.minBs,
    maxBs: index.maxBs,
    minAd: index.minAd,
    maxAd: index.maxAd,
    yearCount: index.years.length,
  };
}

/** True when `year` is inside the loaded table and on or before `verifiedThrough`. */
export function isVerifiedYear(year: number): boolean {
  if (!Number.isInteger(year)) return false;
  const index = getCalendarIndex();
  return year >= index.minBs.year && year <= index.verifiedThrough;
}

/**
 * Warning for years the table still converts but has not been checked
 * against the Nepal Panchang Nirnayak Samiti calendar.
 */
export function getDateAccuracy(year: number): DateAccuracy {
  const index = getCalendarIndex();
  const inRange = Number.isInteger(year) && year >= index.minBs.year && year <= index.maxBs.year;
  const verified = inRange && year <= index.verifiedThrough;
  if (inRange && year > index.verifiedThrough) {
    return {
      verified: false,
      verifiedThrough: index.verifiedThrough,
      warning: `BS ${year} is not in the verified range (through ${index.verifiedThrough}). Confirm it against the Nepal Panchang Nirnayak Samiti calendar before relying on it.`,
    };
  }
  return { verified, verifiedThrough: index.verifiedThrough, warning: null };
}

/**
 * Install calendar data at runtime. Built-in data stays available via `resetCalendarData()`.
 * A failed load leaves the active table unchanged.
 *
 * `merge` overlays years onto the active table. The verified-year watermark moves forward
 * only when the incoming file itself contains every year from the current watermark
 * through its own `verifiedThrough`. A one-year patch does not mark later years verified.
 * `replace` uses the supplied document alone.
 */
export function loadCalendarData(input: unknown, options?: LoadCalendarDataOptions): CalendarData {
  const mode = options?.mode ?? 'merge';
  if (mode !== 'merge' && mode !== 'replace') {
    throw new NepalDateKitError('INVALID_DATA', `Unknown load mode "${String(mode)}". Use "merge" or "replace".`);
  }
  const incoming = requireValid(input);
  if (mode === 'replace') {
    activeData = incoming;
    activeIndex = null;
    return cloneCalendarData(activeData);
  }
  const merged = requireValid(mergeCalendarData(activeData, incoming));
  activeData = merged;
  activeIndex = null;
  return cloneCalendarData(activeData);
}

/** Restore the month lengths shipped with this package version. */
export function resetCalendarData(): CalendarData {
  activeData = cloneCalendarData(builtinData);
  activeIndex = null;
  return cloneCalendarData(activeData);
}
