import { assertValidAd, assertValidBs } from './bounds.js';
import { isVerifiedYear } from './calendar-data.js';
import {
  adPartsFromDate,
  adToBs,
  addBsDays,
  addBsMonths,
  addBsYears,
  bsToAd,
  daysInBsMonth,
  diffBsDays,
  parseAdInput,
  weekdayOfBs,
} from './convert.js';
import { NepalDateKitError } from './errors.js';
import { fiscalYearOf, type FiscalYear } from './fiscal.js';
import { formatBs, type FormatOptions, type FormatPreset, type Locale } from './format.js';
import { compareParts, formatIsoDate } from './gregorian.js';
import { parseBs } from './parse.js';
import { isDateParts, type DateParts } from './types.js';

/**
 * A Bikram Sambat calendar date.
 *
 * `new NepaliDate(year, month, day)` and `{ year, month, day }` are BS dates.
 * A JavaScript `Date` is a Gregorian date. BS and AD year numbers overlap
 * (2000–2044 in the built-in table), so Gregorian strings go through `fromAD`.
 * Instances are immutable. Arithmetic returns a new date.
 */
export class NepaliDate implements DateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;

  constructor(year: number, month: number, day: number);
  constructor(input: Date | string | DateParts);
  constructor(input: Date | string | DateParts | number, month?: number, day?: number) {
    const parts = resolveConstructor(input, month, day);
    this.year = parts.year;
    this.month = parts.month;
    this.day = parts.day;
  }

  static fromBS(year: number, month: number, day: number): NepaliDate;
  static fromBS(input: string | DateParts | NepaliDate): NepaliDate;
  static fromBS(input: string | DateParts | NepaliDate | number, month?: number, day?: number): NepaliDate {
    if (typeof input === 'number') {
      if (month === undefined || day === undefined) {
        throw new NepalDateKitError('INVALID_DATE', 'fromBS(year, month, day) needs all three numbers.');
      }
      return new NepaliDate(input, month, day);
    }
    if (input instanceof NepaliDate) return new NepaliDate(input.year, input.month, input.day);
    if (typeof input === 'string') return new NepaliDate(parseBs(input));
    if (isDateParts(input)) return new NepaliDate(input.year, input.month, input.day);
    throw new NepalDateKitError('INVALID_DATE', 'fromBS expects a BS date string or { year, month, day }.');
  }

  static fromAD(year: number, month: number, day: number): NepaliDate;
  static fromAD(input: Date | string | DateParts | NepaliDate): NepaliDate;
  static fromAD(
    input: Date | string | DateParts | NepaliDate | number,
    month?: number,
    day?: number,
  ): NepaliDate {
    if (input instanceof NepaliDate) return NepaliDate.fromAD(input.toDate());
    if (typeof input === 'number') {
      if (month === undefined || day === undefined) {
        throw new NepalDateKitError('INVALID_DATE', 'fromAD(year, month, day) needs all three numbers.');
      }
      return new NepaliDate(adToBs(input, month, day));
    }
    if (input instanceof Date) return new NepaliDate(adToBs(input));
    if (typeof input === 'string') return new NepaliDate(adToBs(parseAdInput(input)));
    if (isDateParts(input)) return new NepaliDate(adToBs(input.year, input.month, input.day));
    throw new NepalDateKitError('INVALID_DATE', 'fromAD expects a Date, an AD string, or { year, month, day }.');
  }

  /** BS date for the local calendar day of `now` (defaults to the current time). */
  static today(now: Date = new Date()): NepaliDate {
    return NepaliDate.fromAD(now);
  }

  static parse(input: string): NepaliDate {
    return new NepaliDate(parseBs(input));
  }

  static isValid(year: number, month: number, day: number): boolean;
  static isValid(input: Date | string | DateParts | NepaliDate): boolean;
  static isValid(
    input: Date | string | DateParts | NepaliDate | number,
    month?: number,
    day?: number,
  ): boolean {
    try {
      if (typeof input === 'number') {
        if (month === undefined || day === undefined) return false;
        assertValidBs({ year: input, month, day });
        return true;
      }
      if (input instanceof NepaliDate) return true;
      if (input instanceof Date) {
        assertValidAd(adPartsFromDate(input));
        return true;
      }
      if (typeof input === 'string') {
        parseBs(input);
        return true;
      }
      if (isDateParts(input)) {
        assertValidBs(input);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  static daysInMonth(year: number, month: number): number {
    return daysInBsMonth(year, month);
  }

  /** 0 Sunday through 6 Saturday. */
  get weekday(): number {
    return weekdayOfBs(this.year, this.month, this.day);
  }

  /** False for loaded years after the dataset's `verifiedThrough` year. */
  get isVerified(): boolean {
    return isVerifiedYear(this.year);
  }

  toBS(): DateParts {
    return { year: this.year, month: this.month, day: this.day };
  }

  toAD(): DateParts {
    return bsToAd(this.year, this.month, this.day);
  }

  /** Local midnight on the matching Gregorian calendar day. */
  toDate(): Date {
    const ad = this.toAD();
    return new Date(ad.year, ad.month - 1, ad.day);
  }

  /** `YYYY-MM-DD` in BS, for example `2083-07-17`. */
  toString(): string {
    return formatIsoDate(this);
  }

  toJSON(): string {
    return this.toString();
  }

  /** Numeric `YYYYMMDD` so dates sort and compare with ordinary operators. */
  valueOf(): number {
    return this.year * 10_000 + this.month * 100 + this.day;
  }

  format(presetOrPattern: FormatPreset | string, localeOrOptions?: Locale | FormatOptions): string {
    return formatBs(this, presetOrPattern, localeOrOptions);
  }

  addDays(amount: number): NepaliDate {
    return new NepaliDate(addBsDays(this, amount));
  }

  subtractDays(amount: number): NepaliDate {
    return this.addDays(-amount);
  }

  addMonths(amount: number): NepaliDate {
    return new NepaliDate(addBsMonths(this, amount));
  }

  subtractMonths(amount: number): NepaliDate {
    return this.addMonths(-amount);
  }

  addYears(amount: number): NepaliDate {
    return new NepaliDate(addBsYears(this, amount));
  }

  subtractYears(amount: number): NepaliDate {
    return this.addYears(-amount);
  }

  /**
   * Signed distance from `other` to this date (`this - other`).
   * Days are exact. Months and years are calendar units: the day of the month is not consulted.
   */
  diff(other: NepaliDate | DateParts, unit: 'days' | 'months' | 'years' = 'days'): number {
    const them = asParts(other);
    if (unit === 'days') return diffBsDays(this, them);
    if (unit === 'months') return (this.year - them.year) * 12 + (this.month - them.month);
    if (unit === 'years') return this.year - them.year;
    throw new NepalDateKitError('INVALID_DATE', `Unknown diff unit "${String(unit)}". Use "days", "months", or "years".`);
  }

  compare(other: NepaliDate | DateParts): -1 | 0 | 1 {
    return compareParts(this, asParts(other));
  }

  isBefore(other: NepaliDate | DateParts): boolean {
    return this.compare(other) < 0;
  }

  isAfter(other: NepaliDate | DateParts): boolean {
    return this.compare(other) > 0;
  }

  isSame(other: NepaliDate | DateParts): boolean {
    return this.compare(other) === 0;
  }

  startOfMonth(): NepaliDate {
    return new NepaliDate(this.year, this.month, 1);
  }

  endOfMonth(): NepaliDate {
    return new NepaliDate(this.year, this.month, this.daysInMonth());
  }

  daysInMonth(): number {
    return daysInBsMonth(this.year, this.month);
  }

  fiscalYear(): FiscalYear {
    return fiscalYearOf(this.year, this.month);
  }
}

function asParts(value: NepaliDate | DateParts): DateParts {
  if (value instanceof NepaliDate) return value.toBS();
  if (!isDateParts(value)) {
    throw new NepalDateKitError('INVALID_DATE', 'Expected a NepaliDate or { year, month, day }.');
  }
  assertValidBs(value);
  return { year: value.year, month: value.month, day: value.day };
}

function resolveConstructor(
  input: Date | string | DateParts | number,
  month?: number,
  day?: number,
): DateParts {
  if (typeof input === 'number') {
    if (typeof month !== 'number' || typeof day !== 'number' || !Number.isInteger(month) || !Number.isInteger(day)) {
      throw new NepalDateKitError('INVALID_DATE', 'new NepaliDate(year, month, day) needs three integers, a BS date.');
    }
    const parts = { year: input, month, day };
    assertValidBs(parts);
    return parts;
  }
  if (month !== undefined || day !== undefined) {
    throw new NepalDateKitError(
      'INVALID_DATE',
      'Pass new NepaliDate(year, month, day) or a single Date, BS string, or { year, month, day }.',
    );
  }
  if (input instanceof Date) return adToBs(adPartsFromDate(input));
  if (typeof input === 'string') return parseBs(input);
  if (input instanceof NepaliDate) return { year: input.year, month: input.month, day: input.day };
  if (isDateParts(input)) {
    const parts = { year: input.year, month: input.month, day: input.day };
    assertValidBs(parts);
    return parts;
  }
  throw new NepalDateKitError('INVALID_DATE', 'Unsupported NepaliDate input.');
}
