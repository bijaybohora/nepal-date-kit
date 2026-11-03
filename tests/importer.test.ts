import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CALENDAR_DATA_FORMAT,
  NepalDateKitError,
  adToBs,
  bsToAd,
  daysInBsMonth,
  getBuiltinCalendarData,
  getCalendarData,
  getCalendarMeta,
  isVerifiedYear,
  loadCalendarData,
  resetCalendarData,
  validateCalendarData,
  type CalendarData,
} from '../src/index.js';

function year2101(): CalendarData {
  return {
    format: CALENDAR_DATA_FORMAT,
    version: 1,
    source: 'test extension',
    anchor: { bs: '2101-01-01', ad: '2044-04-14' },
    verifiedThrough: 2101,
    years: {
      2101: {
        months: [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
        adStartOfYear: '2044-04-14',
      },
    },
  };
}

describe('calendar data importer', () => {
  it('ships a validated built-in table for BS 2000-2100', () => {
    const meta = getCalendarMeta();
    expect(meta.format).toBe(CALENDAR_DATA_FORMAT);
    expect(meta.verifiedThrough).toBe(2086);
    expect(meta.minBs).toEqual({ year: 2000, month: 1, day: 1 });
    expect(meta.maxBs).toEqual({ year: 2100, month: 12, day: 31 });
    expect(meta.minAd).toEqual({ year: 1943, month: 4, day: 14 });
    expect(meta.maxAd).toEqual({ year: 2044, month: 4, day: 13 });
    expect(meta.yearCount).toBe(101);
    expect(meta.unverifiedYears).toContain('2087');
    const builtin = validateCalendarData(getBuiltinCalendarData());
    expect(builtin.ok).toBe(true);
    expect(builtin.errors).toEqual([]);
  });

  it('matches the published JSON Schema on the points the file can express', () => {
    const schema = JSON.parse(readFileSync(new URL('../schema/calendar-data.schema.json', import.meta.url), 'utf8')) as {
      properties: {
        format: { const: string };
        version: { const: number };
      };
      additionalProperties: boolean;
      $defs: {
        year: { properties: { months: { minItems: number; maxItems: number; items: { minimum: number; maximum: number } } } };
      };
    };
    expect(schema.properties.format.const).toBe(CALENDAR_DATA_FORMAT);
    expect(schema.properties.version.const).toBe(1);
    expect(schema.additionalProperties).toBe(false);
    expect(schema.$defs.year.properties.months.minItems).toBe(12);
    expect(schema.$defs.year.properties.months.maxItems).toBe(12);
    expect(schema.$defs.year.properties.months.items.minimum).toBe(29);
    expect(schema.$defs.year.properties.months.items.maximum).toBe(32);
  });

  it('rejects malformed documents, including event fields', () => {
    expect(validateCalendarData(null).ok).toBe(false);
    expect(validateCalendarData('{').errors[0]).toContain('JSON');
    expect(validateCalendarData({ format: 'other', version: 1 }).ok).toBe(false);

    const builtin = getBuiltinCalendarData();
    const withFestivals = { ...builtin, festivals: [{ name: 'Dashain' }] };
    const festivalResult = validateCalendarData(withFestivals);
    expect(festivalResult.ok).toBe(false);
    expect(festivalResult.errors.join(' ')).toContain('festivals');

    const shortMonth = structuredClone(builtin);
    const year = shortMonth.years['2083'];
    if (!year) throw new Error('missing 2083');
    year.months = [28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30];
    expect(validateCalendarData(shortMonth).errors.join(' ')).toContain('29 through 32');

    const gap = {
      format: CALENDAR_DATA_FORMAT,
      version: 1,
      anchor: { bs: '2080-01-01', ad: '2023-04-14' },
      verifiedThrough: 2080,
      years: {
        2080: { months: Array(12).fill(30), adStartOfYear: '2023-04-14' },
        2082: { months: Array(12).fill(30), adStartOfYear: '2025-04-14' },
      },
    };
    expect(validateCalendarData(gap).errors.join(' ')).toContain('contiguous');

    expect(() => loadCalendarData(withFestivals)).toThrow(NepalDateKitError);
    expect(bsToAd(2000, 1, 1).year).toBe(1943);
  });

  it('merges a later year without moving the verified watermark or breaking 2100', () => {
    const loaded = loadCalendarData(JSON.stringify(year2101()));
    expect(loaded.years['2101']?.adStartOfYear).toBe('2044-04-14');
    expect(getCalendarMeta().maxBs).toEqual({ year: 2101, month: 12, day: 30 });
    expect(bsToAd(2101, 1, 1)).toEqual({ year: 2044, month: 4, day: 14 });
    expect(adToBs('2044-04-13')).toEqual({ year: 2100, month: 12, day: 31 });
    expect(isVerifiedYear(2101)).toBe(false);
    expect(isVerifiedYear(2086)).toBe(true);
    expect(daysInBsMonth(2083, 1)).toBe(31);

    resetCalendarData();
    expect(() => bsToAd(2101, 1, 1)).toThrow(NepalDateKitError);
    expect(getBuiltinCalendarData().years['2101']).toBeUndefined();
  });

  it('moves the verified watermark when the patch covers every year in between', () => {
    const builtin = getBuiltinCalendarData();
    const years: CalendarData['years'] = {};
    for (let year = 2087; year <= 2100; year += 1) {
      const info = builtin.years[String(year)];
      if (!info) throw new Error(String(year));
      years[String(year)] = info;
    }
    loadCalendarData({
      format: CALENDAR_DATA_FORMAT,
      version: 1,
      anchor: { bs: '2087-01-01', ad: years['2087']?.adStartOfYear ?? '' },
      verifiedThrough: 2087,
      years,
    });
    expect(isVerifiedYear(2087)).toBe(true);
    expect(isVerifiedYear(2088)).toBe(false);
  });

  it('replaces the active table and restores it', () => {
    const builtin = getBuiltinCalendarData();
    const year = builtin.years['2083'];
    if (!year) throw new Error('missing year');
    loadCalendarData(
      {
        format: CALENDAR_DATA_FORMAT,
        version: 1,
        anchor: { bs: '2083-01-01', ad: year.adStartOfYear },
        verifiedThrough: 2083,
        years: { 2083: year },
      },
      { mode: 'replace' },
    );
    expect(() => bsToAd(2000, 1, 1)).toThrow(NepalDateKitError);
    expect(bsToAd(2083, 1, 1)).toEqual({ year: 2026, month: 4, day: 14 });
    expect(getCalendarMeta().yearCount).toBe(1);

    const broken = {
      format: CALENDAR_DATA_FORMAT,
      version: 1,
      anchor: { bs: '2105-01-01', ad: '2048-04-14' },
      verifiedThrough: 2105,
      years: {
        2105: { months: Array<number>(12).fill(30), adStartOfYear: '2048-04-14' },
      },
    };
    expect(validateCalendarData(broken).ok).toBe(true);
    expect(() => loadCalendarData(broken)).toThrow(NepalDateKitError);
    expect(getCalendarMeta().yearCount).toBe(1);

    resetCalendarData();
    expect(getCalendarMeta().yearCount).toBe(101);
  });

  it('refuses a merged year that breaks the AD chain', () => {
    const builtin = getBuiltinCalendarData();
    const year = builtin.years['2083'];
    if (!year) throw new Error('missing year');
    const corrected = {
      ...year,
      months: [30, ...year.months.slice(1)],
    };
    const result = validateCalendarData({
      format: CALENDAR_DATA_FORMAT,
      version: 1,
      anchor: { bs: '2083-01-01', ad: year.adStartOfYear },
      verifiedThrough: 2083,
      years: { 2083: corrected },
    });
    expect(result.ok).toBe(true);
    expect(() =>
      loadCalendarData({
        format: CALENDAR_DATA_FORMAT,
        version: 1,
        anchor: { bs: '2083-01-01', ad: year.adStartOfYear },
        verifiedThrough: 2083,
        years: { 2083: corrected },
      }),
    ).toThrow(/previous year ends/i);
    expect(daysInBsMonth(2083, 1)).toBe(31);
    expect(getCalendarData().years['2000']).toBeDefined();
  });
});
