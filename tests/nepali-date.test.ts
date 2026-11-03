import { describe, expect, it } from 'vitest';
import { NepaliDate, NepalDateKitError, getDateAccuracy, isVerifiedYear } from '../src/index.js';

describe('NepaliDate', () => {
  const kartik = new NepaliDate(2083, 7, 17);

  it('reads fields, weekday, and both calendars', () => {
    expect(kartik.year).toBe(2083);
    expect(kartik.month).toBe(7);
    expect(kartik.day).toBe(17);
    expect(kartik.weekday).toBe(2);
    expect(kartik.toBS()).toEqual({ year: 2083, month: 7, day: 17 });
    expect(kartik.toAD()).toEqual({ year: 2026, month: 11, day: 3 });
    const js = kartik.toDate();
    expect(js.getFullYear()).toBe(2026);
    expect(js.getMonth()).toBe(10);
    expect(js.getDate()).toBe(3);
    expect(js.getHours()).toBe(0);
    expect(kartik.toString()).toBe('2083-07-17');
    expect(kartik.toJSON()).toBe('2083-07-17');
    expect(JSON.stringify(kartik)).toBe('"2083-07-17"');
    expect(kartik.isVerified).toBe(true);
  });

  it('builds dates from AD values, strings, and today()', () => {
    expect(NepaliDate.fromAD(2026, 11, 3).isSame(kartik)).toBe(true);
    expect(NepaliDate.fromAD('2026-11-03').isSame(kartik)).toBe(true);
    expect(NepaliDate.fromAD(new Date(2026, 10, 3)).isSame(kartik)).toBe(true);
    expect(new NepaliDate(new Date(2026, 10, 3)).isSame(kartik)).toBe(true);
    expect(NepaliDate.fromBS('2083-07-17').isSame(kartik)).toBe(true);
    expect(NepaliDate.parse('17 Kartik 2083').isSame(kartik)).toBe(true);
    expect(NepaliDate.today(new Date(2026, 10, 3)).isSame(kartik)).toBe(true);
    expect(NepaliDate.fromBS(kartik).isSame(kartik)).toBe(true);
  });

  it('adds and subtracts days, months, and years, clamping the day', () => {
    expect(kartik.addDays(14).toBS()).toEqual({ year: 2083, month: 8, day: 1 });
    expect(kartik.subtractDays(16).toBS()).toEqual({ year: 2083, month: 7, day: 1 });
    expect(kartik.addMonths(1).toBS()).toEqual({ year: 2083, month: 8, day: 17 });
    expect(kartik.addMonths(6).toBS()).toEqual({ year: 2084, month: 1, day: 17 });
    expect(new NepaliDate(2083, 1, 15).subtractMonths(1).toBS()).toEqual({ year: 2082, month: 12, day: 15 });
    expect(kartik.addYears(1).toBS()).toEqual({ year: 2084, month: 7, day: 17 });
    expect(kartik.subtractYears(1).toBS()).toEqual({ year: 2082, month: 7, day: 17 });
    expect(new NepaliDate(2000, 2, 32).addYears(1).toBS()).toEqual({ year: 2001, month: 2, day: 31 });
    expect(new NepaliDate(2083, 3, 32).addMonths(1).toBS()).toEqual({ year: 2083, month: 4, day: 31 });
  });

  it('measures differences and orders dates', () => {
    const later = new NepaliDate(2083, 8, 1);
    expect(later.diff(kartik, 'days')).toBe(14);
    expect(kartik.diff(later, 'days')).toBe(-14);
    expect(later.diff(kartik, 'months')).toBe(1);
    expect(kartik.addYears(2).diff(kartik, 'years')).toBe(2);
    expect(kartik.compare(later)).toBe(-1);
    expect(later.compare(kartik)).toBe(1);
    expect(kartik.compare(NepaliDate.parse('2083-07-17'))).toBe(0);
    expect(kartik.isBefore(later)).toBe(true);
    expect(later.isAfter(kartik)).toBe(true);
    expect(kartik.isSame({ year: 2083, month: 7, day: 17 })).toBe(true);
    expect(+kartik < +later).toBe(true);
  });

  it('finds the ends of the month', () => {
    expect(kartik.startOfMonth().toString()).toBe('2083-07-01');
    expect(kartik.endOfMonth().toString()).toBe('2083-07-30');
    expect(kartik.daysInMonth()).toBe(30);
    expect(NepaliDate.daysInMonth(2000, 2)).toBe(32);
    expect(new NepaliDate(2100, 12, 31).endOfMonth().isSame(new NepaliDate(2100, 12, 31))).toBe(true);
  });

  it('checks validity without throwing', () => {
    expect(NepaliDate.isValid(2083, 7, 17)).toBe(true);
    expect(NepaliDate.isValid(2083, 7, 0)).toBe(false);
    expect(NepaliDate.isValid('nope')).toBe(false);
    expect(NepaliDate.isValid(new Date(1900, 0, 1))).toBe(false);
    expect(NepaliDate.isValid(new Date(2026, 10, 3))).toBe(true);
    expect(NepaliDate.isValid({ year: 2083, month: 13, day: 1 })).toBe(false);
  });

  it('throws on arithmetic that leaves the supported range', () => {
    expect(() => new NepaliDate(2000, 1, 1).subtractDays(1)).toThrow(NepalDateKitError);
    expect(() => new NepaliDate(2100, 12, 31).addDays(1)).toThrow(NepalDateKitError);
    try {
      new NepaliDate(2000, 1, 1).subtractDays(1);
    } catch (error) {
      expect((error as NepalDateKitError).code).toBe('OUT_OF_RANGE');
    }
    expect(() => kartik.addDays(1.5)).toThrow(NepalDateKitError);
  });

  it('flags years after 2086', () => {
    expect(isVerifiedYear(2086)).toBe(true);
    expect(isVerifiedYear(2087)).toBe(false);
    expect(isVerifiedYear(1999)).toBe(false);
    expect(isVerifiedYear(2100)).toBe(false);
    expect(new NepaliDate(2086, 1, 1).isVerified).toBe(true);
    expect(new NepaliDate(2087, 1, 1).isVerified).toBe(false);
    expect(getDateAccuracy(2086).warning).toBeNull();
    expect(getDateAccuracy(2087).verified).toBe(false);
    expect(getDateAccuracy(2087).warning).toContain('Panchang Nirnayak Samiti');
    expect(getDateAccuracy(1999).warning).toBeNull();
  });
});
