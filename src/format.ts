import { assertValidBs } from './bounds.js';
import { AD_MONTHS, BS_MONTHS, WEEKDAYS } from './constants.js';
import { bsToAd } from './convert.js';
import { toNepaliDigits } from './digits.js';
import { NepalDateKitError } from './errors.js';
import { fiscalYearOf } from './fiscal.js';
import { diffDays, formatIsoDate, pad2, weekdayOf } from './gregorian.js';
import { isDateParts, type DateParts } from './types.js';

export const FORMAT_PRESETS = [
  'full',
  'long',
  'iso',
  'slash',
  'dmy',
  'short',
  'monthYear',
  'gate',
  'dual',
  'relative',
  'fiscal',
] as const;

export type FormatPreset = (typeof FORMAT_PRESETS)[number];

export type Locale = 'ne' | 'en';

export interface FormatOptions {
  /** Defaults to English. Nepali presets use Devanagari digits and Nepali names. */
  locale?: Locale;
  /**
   * Reference date for the `relative` preset.
   * A `Date` is Gregorian. `{ year, month, day }` and objects with `toAD()` are BS dates.
   * Defaults to the current local date.
   */
  now?: Date | DateParts | { toAD: () => DateParts };
}

const PRESET_SET = new Set<string>(FORMAT_PRESETS);

export function isFormatPreset(value: string): value is FormatPreset {
  return PRESET_SET.has(value);
}

function assertLocale(locale: string): asserts locale is Locale {
  if (locale !== 'en' && locale !== 'ne') {
    throw new NepalDateKitError('INVALID_DATE', `Unknown locale "${locale}". Use "en" or "ne".`);
  }
}

function resolveFormatArgs(localeOrOptions?: Locale | FormatOptions): { locale: Locale; options: FormatOptions } {
  if (localeOrOptions === undefined) return { locale: 'en', options: {} };
  if (typeof localeOrOptions === 'string') {
    assertLocale(localeOrOptions);
    return { locale: localeOrOptions, options: { locale: localeOrOptions } };
  }
  const locale = localeOrOptions.locale ?? 'en';
  assertLocale(locale);
  return { locale, options: localeOrOptions };
}

function localToday(): DateParts {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

function resolveNowAd(now: FormatOptions['now']): DateParts {
  if (now === undefined) return localToday();
  if (now instanceof Date) {
    if (Number.isNaN(now.getTime())) {
      throw new NepalDateKitError('INVALID_DATE', 'format now is an invalid Date.');
    }
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  }
  if (typeof now === 'object' && now !== null && 'toAD' in now && typeof now.toAD === 'function') {
    return now.toAD();
  }
  if (isDateParts(now)) return bsToAd(now);
  throw new NepalDateKitError(
    'INVALID_DATE',
    'format now must be a Date, a BS { year, month, day }, or a NepaliDate.',
  );
}

function relativePhrase(daysBefore: number, locale: Locale): string {
  if (daysBefore === 0) return locale === 'ne' ? 'आज' : 'today';
  if (daysBefore === 1) return locale === 'ne' ? 'हिजो' : 'yesterday';
  if (daysBefore === -1) return locale === 'ne' ? 'भोलि' : 'tomorrow';
  if (daysBefore > 1) {
    return locale === 'ne' ? `${toNepaliDigits(daysBefore)} दिन अघि` : `${daysBefore} days ago`;
  }
  const ahead = Math.abs(daysBefore);
  return locale === 'ne' ? `${toNepaliDigits(ahead)} दिन पछि` : `in ${ahead} days`;
}

function renderPreset(parts: DateParts, preset: FormatPreset, locale: Locale, options: FormatOptions): string {
  const ad = bsToAd(parts);
  const month = BS_MONTHS[parts.month - 1];
  const weekday = WEEKDAYS[weekdayOf(ad)];
  const adMonth = AD_MONTHS[ad.month - 1];
  if (!month || !weekday || !adMonth) {
    throw new NepalDateKitError('INVALID_DATE', 'Could not format this date.');
  }
  const neDay = toNepaliDigits(parts.day);
  const neYear = toNepaliDigits(parts.year);

  switch (preset) {
    case 'full':
      return locale === 'ne'
        ? `${weekday.ne}, ${neDay} ${month.ne} ${neYear}`
        : `${weekday.en}, ${parts.day} ${month.en} ${parts.year}`;
    case 'long':
      return locale === 'ne' ? `${neDay} ${month.ne} ${neYear}` : `${parts.day} ${month.en} ${parts.year}`;
    case 'iso':
      return formatIsoDate(parts);
    case 'slash':
      return `${parts.year}/${pad2(parts.month)}/${pad2(parts.day)}`;
    case 'dmy':
      return `${pad2(parts.day)}/${pad2(parts.month)}/${parts.year}`;
    case 'short':
      return locale === 'ne'
        ? `${neDay} ${month.neShort} ${neYear}`
        : `${parts.day} ${month.enShort} ${parts.year}`;
    case 'monthYear':
      return locale === 'ne' ? `${month.ne} ${neYear}` : `${month.en} ${parts.year}`;
    case 'gate':
      return locale === 'ne'
        ? `${neYear} साल ${month.ne} ${neDay} गते`
        : `${parts.day} ${month.en} ${parts.year} BS`;
    case 'dual':
      return locale === 'ne'
        ? `${neDay} ${month.ne} ${neYear} (${toNepaliDigits(ad.day)} ${adMonth.neShort} ${toNepaliDigits(ad.year)})`
        : `${parts.day} ${month.en} ${parts.year} (${ad.day} ${adMonth.enShort} ${ad.year})`;
    case 'relative':
      return relativePhrase(diffDays(resolveNowAd(options.now), ad), locale);
    case 'fiscal': {
      const fiscal = fiscalYearOf(parts.year, parts.month);
      return locale === 'ne' ? `आ.व. ${toNepaliDigits(fiscal.code)}` : `FY ${fiscal.code}`;
    }
    default: {
      const exhaustive: never = preset;
      return exhaustive;
    }
  }
}

function renderPattern(parts: DateParts, pattern: string, locale: Locale): string {
  const ad = bsToAd(parts);
  const month = BS_MONTHS[parts.month - 1];
  const weekday = WEEKDAYS[weekdayOf(ad)];
  if (!month || !weekday) throw new NepalDateKitError('INVALID_DATE', 'Could not format this date.');
  const useNepali = locale === 'ne';
  const num = (value: number, width?: number): string => {
    const text = width === undefined ? String(value) : String(value).padStart(width, '0');
    return useNepali ? toNepaliDigits(text) : text;
  };
  return pattern.replace(
    /\[([^\]]*)\]|YYYY|YY|MMMM|MMM|MM|M|DD|D|dddd|ddd/g,
    (match, literal: string | undefined) => {
      if (literal !== undefined) return literal;
      switch (match) {
        case 'YYYY':
          return num(parts.year, 4);
        case 'YY':
          return num(parts.year % 100, 2);
        case 'MMMM':
          return useNepali ? month.ne : month.en;
        case 'MMM':
          return useNepali ? month.neShort : month.enShort;
        case 'MM':
          return num(parts.month, 2);
        case 'M':
          return num(parts.month);
        case 'DD':
          return num(parts.day, 2);
        case 'D':
          return num(parts.day);
        case 'dddd':
          return useNepali ? weekday.ne : weekday.en;
        case 'ddd':
          return useNepali ? weekday.neShort : weekday.enShort;
        default:
          return match;
      }
    },
  );
}

/**
 * Format a BS date with a named preset or a token pattern.
 * Machine presets `iso`, `slash`, and `dmy` always use ASCII digits.
 * In a custom pattern, Nepali locale uses Devanagari digits. Wrap literal text in `[brackets]`.
 */
export function formatBs(
  input: DateParts,
  presetOrPattern: FormatPreset | string,
  localeOrOptions?: Locale | FormatOptions,
): string {
  if (!isDateParts(input)) {
    throw new NepalDateKitError('INVALID_DATE', 'formatBs expects a BS date with year, month, and day.');
  }
  const parts = { year: input.year, month: input.month, day: input.day };
  assertValidBs(parts);
  const { locale, options } = resolveFormatArgs(localeOrOptions);
  if (isFormatPreset(presetOrPattern)) return renderPreset(parts, presetOrPattern, locale, options);
  return renderPattern(parts, presetOrPattern, locale);
}
