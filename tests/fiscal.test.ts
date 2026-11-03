import { describe, expect, it } from 'vitest';
import { NepaliDate, fiscalYearOf } from '../src/index.js';

describe('fiscal year', () => {
  it('starts on 1 Shrawan', () => {
    expect(fiscalYearOf(2083, 4)).toMatchObject({ startYear: 2083, endYear: 2084, code: '2083/84' });
    expect(fiscalYearOf(2083, 3)).toMatchObject({ startYear: 2082, endYear: 2083, code: '2082/83' });
    expect(new NepaliDate(2083, 4, 1).fiscalYear().code).toBe('2083/84');
    expect(new NepaliDate(2083, 3, 32).fiscalYear().code).toBe('2082/83');
    expect(new NepaliDate(2083, 4, 1).format('fiscal', 'en')).toBe('FY 2083/84');
    expect(new NepaliDate(2083, 3, 32).format('fiscal', 'ne')).toBe('आ.व. २०८२/८३');
  });

  it('handles the first and last loaded years', () => {
    expect(new NepaliDate(2000, 3, 31).fiscalYear().code).toBe('1999/00');
    expect(new NepaliDate(2000, 3, 31).format('fiscal', 'ne')).toBe('आ.व. १९९९/००');
    expect(new NepaliDate(2000, 4, 1).format('fiscal', 'en')).toBe('FY 2000/01');
    expect(new NepaliDate(2099, 4, 1).fiscalYear().code).toBe('2099/00');
    expect(new NepaliDate(2100, 3, 31).fiscalYear().code).toBe('2099/00');
    expect(new NepaliDate(2100, 4, 1).format('fiscal', 'en')).toBe('FY 2100/01');
    expect(new NepaliDate(2100, 12, 31).format('fiscal', 'ne')).toBe('आ.व. २१००/०१');
  });
});
