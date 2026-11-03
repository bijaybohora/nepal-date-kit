import { describe, expect, it } from 'vitest';
import { NepaliDate, NepalDateKitError, formatBs, parseBs, toEnglishDigits, toNepaliDigits } from '../src/index.js';

const date = new NepaliDate(2083, 7, 17);

describe('formatting', () => {
  it('renders every preset in Nepali and English', () => {
    expect(date.format('full', 'ne')).toBe('मंगलबार, १७ कार्तिक २०८३');
    expect(date.format('full', 'en')).toBe('Tuesday, 17 Kartik 2083');
    expect(date.format('long', 'ne')).toBe('१७ कार्तिक २०८३');
    expect(date.format('long', 'en')).toBe('17 Kartik 2083');
    expect(date.format('iso')).toBe('2083-07-17');
    expect(date.format('iso', 'ne')).toBe('2083-07-17');
    expect(date.format('slash')).toBe('2083/07/17');
    expect(date.format('dmy')).toBe('17/07/2083');
    expect(date.format('short', 'ne')).toBe('१७ का २०८३');
    expect(date.format('short', 'en')).toBe('17 Kar 2083');
    expect(date.format('monthYear', 'ne')).toBe('कार्तिक २०८३');
    expect(date.format('monthYear', 'en')).toBe('Kartik 2083');
    expect(date.format('gate', 'ne')).toBe('२०८३ साल कार्तिक १७ गते');
    expect(date.format('gate', 'en')).toBe('17 Kartik 2083 BS');
    expect(date.format('dual', 'en')).toBe('17 Kartik 2083 (3 Nov 2026)');
    expect(date.format('dual', 'ne')).toBe('१७ कार्तिक २०८३ (३ नोभ २०२६)');
    expect(date.format('fiscal', 'ne')).toBe('आ.व. २०८३/८४');
    expect(date.format('fiscal', 'en')).toBe('FY 2083/84');
    expect(formatBs(date, 'long', { locale: 'en' })).toBe('17 Kartik 2083');
  });

  it('formats relative time against an explicit reference', () => {
    const now = new NepaliDate(2083, 7, 20);
    expect(date.format('relative', { locale: 'ne', now })).toBe('३ दिन अघि');
    expect(date.format('relative', { locale: 'en', now })).toBe('3 days ago');
    expect(date.format('relative', { locale: 'en', now: new Date(2026, 10, 6) })).toBe('3 days ago');
    expect(date.format('relative', { locale: 'ne', now: new NepaliDate(2083, 7, 17) })).toBe('आज');
    expect(date.format('relative', { locale: 'en', now: date })).toBe('today');
    expect(date.format('relative', { locale: 'ne', now: new NepaliDate(2083, 7, 16) })).toBe('भोलि');
    expect(date.format('relative', { locale: 'en', now: new NepaliDate(2083, 7, 16) })).toBe('tomorrow');
    expect(date.format('relative', { locale: 'en', now: new NepaliDate(2083, 7, 18) })).toBe('yesterday');
    expect(date.format('relative', { locale: 'ne', now: new NepaliDate(2083, 7, 14) })).toBe('३ दिन पछि');
    expect(date.format('relative', { locale: 'en', now: new NepaliDate(2083, 7, 14) })).toBe('in 3 days');
  });

  it('replaces custom tokens and keeps bracketed text', () => {
    expect(date.format('dddd, D MMMM YYYY')).toBe('Tuesday, 17 Kartik 2083');
    expect(date.format('YY/MM/DD', 'ne')).toBe('८३/०७/१७');
    expect(date.format('ddd MMM', 'en')).toBe('Tue Kar');
    expect(date.format('[BS] YYYY', 'en')).toBe('BS 2083');
    expect(date.format('D', 'en')).toBe('17');
    expect(date.format('M', 'en')).toBe('7');
  });
});

describe('parsing', () => {
  const expected = { year: 2083, month: 7, day: 17 };

  it('reads common numeric and named BS forms', () => {
    const samples = [
      '2083-07-17',
      '2083/7/17',
      '2083.07.17',
      '17/07/2083',
      '17-7-2083',
      '17.07.2083',
      '२०८३-०७-१७',
      '१७/०७/२०८३',
      '17 Kartik 2083',
      '17th Kartik 2083',
      'kartik 17, 2083',
      '2083 Kartik 17',
      'Sunday, 17 Kartik 2083',
      'मंगलबार, १७ कार्तिक २०८३',
      '१७ गते कार्तिक २०८३',
      '2083 साल कार्तिक 17 गते',
      'BS 2083-07-17',
      'वि.सं. २०८३-०७-१७',
    ];
    for (const sample of samples) {
      expect(parseBs(sample), sample).toEqual(expected);
    }
    expect(parseBs('17 Asoj 2083')).toEqual({ year: 2083, month: 6, day: 17 });
  });

  it('rejects text that is not a BS date', () => {
    expect(() => parseBs('not a date')).toThrow(NepalDateKitError);
    try {
      parseBs('tomorrow');
    } catch (error) {
      expect((error as NepalDateKitError).code).toBe('PARSE_ERROR');
    }
    try {
      parseBs('2083-07-32');
    } catch (error) {
      expect((error as NepalDateKitError).code).toBe('INVALID_DATE');
    }
  });
});

describe('digits', () => {
  it('converts both ways', () => {
    expect(toNepaliDigits(2083)).toBe('२०८३');
    expect(toNepaliDigits('FY 2083/84')).toBe('FY २०८३/८४');
    expect(toEnglishDigits('२०८३-०७-१७')).toBe('2083-07-17');
    expect(toEnglishDigits(toNepaliDigits('17 Kartik 2083'))).toBe('17 Kartik 2083');
  });
});
