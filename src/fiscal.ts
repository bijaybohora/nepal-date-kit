import { NepalDateKitError } from './errors.js';
import { pad2 } from './gregorian.js';

/**
 * Nepal's fiscal year runs from 1 Shrawan (month 4) through the last day of Ashadh
 * (month 3) in the next BS year. Baishakh, Jestha, and Aashadha belong to the
 * fiscal year that started the previous Shrawan.
 */
export interface FiscalYear {
  /** BS year of 1 Shrawan, when this fiscal year starts. */
  startYear: number;
  /** BS year of the closing Ashadh. */
  endYear: number;
  /** Zero-padded two-digit end year, for example `84` or `00`. */
  endYearShort: string;
  /** Compact code, for example `2083/84`. */
  code: string;
}

export function fiscalYearOf(year: number, month: number): FiscalYear {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new NepalDateKitError(
      'INVALID_DATE',
      'A fiscal year needs an integer BS year and a month from 1 through 12.',
    );
  }
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;
  const endYearShort = pad2(endYear % 100);
  return {
    startYear,
    endYear,
    endYearShort,
    code: `${startYear}/${endYearShort}`,
  };
}
