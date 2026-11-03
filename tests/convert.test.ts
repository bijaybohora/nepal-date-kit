import { describe, expect, it } from 'vitest';
import {
  BS_MONTHS,
  NepalDateKitError,
  adToBs,
  bsToAd,
  daysInBsMonth,
  isValidAdDate,
  isValidBsDate,
  weekdayOfBs,
} from '../src/index.js';
import { iso, loadMonthFixtures, nextIsoDay } from './fixtures.js';

const rows = loadMonthFixtures();

describe('BS and AD conversion', () => {
  it('anchors 1 Baishakh 2000 on 14 April 1943, a Wednesday', () => {
    expect(bsToAd(2000, 1, 1)).toEqual({ year: 1943, month: 4, day: 14 });
    expect(adToBs(1943, 4, 14)).toEqual({ year: 2000, month: 1, day: 1 });
    expect(weekdayOfBs(2000, 1, 1)).toBe(3);
  });

  it('round-trips every day in the month table and keeps the AD chain', () => {
    const failures: string[] = [];
    let previous: string | null = null;
    let counted = 0;

    for (const row of rows) {
      const month = BS_MONTHS[row.month - 1];
      if (!month || month.en !== row.monthEn || month.ne !== row.monthNe) {
        failures.push(`name ${row.year}-${row.month}`);
      }
      if (daysInBsMonth(row.year, row.month) !== row.days) {
        failures.push(`length ${row.year}-${row.month}`);
      }

      for (let day = 1; day <= row.days; day += 1) {
        const ad = bsToAd(row.year, row.month, day);
        const adIso = iso(ad);
        const back = adToBs(ad);
        counted += 1;
        if (back.year !== row.year || back.month !== row.month || back.day !== day) {
          failures.push(`round-trip ${row.year}-${row.month}-${day} -> ${adIso}`);
        }
        if (day === 1 && adIso !== row.adStart) failures.push(`start ${row.year}-${row.month} ${adIso}`);
        if (day === row.days && adIso !== row.adEnd) failures.push(`end ${row.year}-${row.month} ${adIso}`);
        const expectedWeekday = new Date(Date.UTC(ad.year, ad.month - 1, ad.day)).getUTCDay();
        if (weekdayOfBs(row.year, row.month, day) !== expectedWeekday) {
          failures.push(`weekday ${row.year}-${row.month}-${day}`);
        }
        if (previous && adIso !== nextIsoDay(previous)) {
          failures.push(`gap before ${adIso}`);
        }
        previous = adIso;
        if (failures.length > 8) break;
      }
      if (failures.length > 8) break;
    }

    expect(counted).toBe(rows.reduce((sum, row) => sum + row.days, 0));
    expect(failures).toEqual([]);
    expect(previous).toBe('2044-04-13');
  });

  it('accepts strings and date parts', () => {
    expect(bsToAd('2083-07-17')).toEqual({ year: 2026, month: 11, day: 3 });
    expect(bsToAd({ year: 2083, month: 7, day: 17 })).toEqual({ year: 2026, month: 11, day: 3 });
    expect(adToBs('2026-11-03')).toEqual({ year: 2083, month: 7, day: 17 });
    expect(adToBs(new Date(2026, 10, 3))).toEqual({ year: 2083, month: 7, day: 17 });
  });

  it('rejects dates outside BS 2000-2100 and impossible days', () => {
    expect(() => bsToAd(1999, 12, 30)).toThrow(NepalDateKitError);
    expect(() => bsToAd(2101, 1, 1)).toThrow(NepalDateKitError);
    expect(() => adToBs(1943, 4, 13)).toThrow(NepalDateKitError);
    expect(() => adToBs(2044, 4, 14)).toThrow(NepalDateKitError);
    expect(() => adToBs(2026, 2, 31)).toThrow(NepalDateKitError);

    for (const [year, month, day] of [
      [1999, 12, 30],
      [2101, 1, 1],
    ] as const) {
      try {
        bsToAd(year, month, day);
        throw new Error('should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NepalDateKitError);
        expect((error as NepalDateKitError).code).toBe('OUT_OF_RANGE');
        expect((error as NepalDateKitError).message).toContain('outside the supported range');
      }
    }

    try {
      bsToAd(2083, 7, 32);
    } catch (error) {
      expect(error).toBeInstanceOf(NepalDateKitError);
      expect((error as NepalDateKitError).code).toBe('INVALID_DATE');
      expect((error as NepalDateKitError).message).toContain('30 days');
    }

    try {
      bsToAd(2083, 13, 1);
    } catch (error) {
      expect((error as NepalDateKitError).code).toBe('INVALID_DATE');
    }

    expect(isValidBsDate(2083, 7, 17)).toBe(true);
    expect(isValidBsDate(2083, 7, 32)).toBe(false);
    expect(isValidBsDate(1999, 1, 1)).toBe(false);
    expect(isValidBsDate(2083.5, 7, 17)).toBe(false);
    expect(isValidAdDate(2026, 11, 3)).toBe(true);
    expect(isValidAdDate(1900, 1, 1)).toBe(false);
    expect(isValidAdDate(2026, 2, 31)).toBe(false);
  });
});
