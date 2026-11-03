import { getCalendarIndex } from './calendar-data.js';
import { bsMonth } from './constants.js';
import { NepalDateKitError } from './errors.js';
import { compareParts, formatIsoDate, isRealGregorianDate } from './gregorian.js';
import type { DateParts } from './types.js';

function rangeMessage(kind: 'BS' | 'AD', parts: DateParts): string {
  const index = getCalendarIndex();
  const min = kind === 'BS' ? index.minBs : index.minAd;
  const max = kind === 'BS' ? index.maxBs : index.maxAd;
  return `${kind} date ${formatIsoDate(parts)} is outside the supported range ${formatIsoDate(min)} through ${formatIsoDate(max)}.`;
}

export function assertValidBs(parts: DateParts): void {
  const { year, month, day } = parts;
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new NepalDateKitError('INVALID_DATE', 'BS year, month, and day must be integers.');
  }
  const index = getCalendarIndex();
  if (year < index.minBs.year || year > index.maxBs.year) {
    throw new NepalDateKitError('OUT_OF_RANGE', rangeMessage('BS', parts));
  }
  if (month < 1 || month > 12) {
    throw new NepalDateKitError(
      'INVALID_DATE',
      `Month ${month} is invalid. BS months are 1 (Baishakh) through 12 (Chaitra).`,
    );
  }
  const length = index.byYear.get(year)?.months[month - 1];
  if (length === undefined) {
    throw new NepalDateKitError('OUT_OF_RANGE', rangeMessage('BS', parts));
  }
  if (day < 1 || day > length) {
    throw new NepalDateKitError(
      'INVALID_DATE',
      `BS date ${formatIsoDate(parts)} is not valid. ${bsMonth(month).en} ${year} has ${length} days.`,
    );
  }
}

export function assertValidAd(parts: DateParts): void {
  const { year, month, day } = parts;
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new NepalDateKitError('INVALID_DATE', 'AD year, month, and day must be integers.');
  }
  if (!isRealGregorianDate(year, month, day)) {
    throw new NepalDateKitError('INVALID_DATE', `AD date ${formatIsoDate(parts)} is not a real Gregorian date.`);
  }
  const index = getCalendarIndex();
  if (compareParts(parts, index.minAd) < 0 || compareParts(parts, index.maxAd) > 0) {
    throw new NepalDateKitError('OUT_OF_RANGE', rangeMessage('AD', parts));
  }
}

export function isValidBsDate(year: number, month: number, day: number): boolean {
  try {
    assertValidBs({ year, month, day });
    return true;
  } catch {
    return false;
  }
}

export function isValidAdDate(year: number, month: number, day: number): boolean {
  try {
    assertValidAd({ year, month, day });
    return true;
  } catch {
    return false;
  }
}
