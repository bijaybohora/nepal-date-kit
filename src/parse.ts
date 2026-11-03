import { assertValidBs } from './bounds.js';
import { BS_MONTHS } from './constants.js';
import { toEnglishDigits } from './digits.js';
import { NepalDateKitError } from './errors.js';
import type { DateParts } from './types.js';

const MONTH_BY_NAME = new Map<string, number>();

for (const month of BS_MONTHS) {
  MONTH_BY_NAME.set(month.en.toLowerCase(), month.number);
  MONTH_BY_NAME.set(month.ne, month.number);
}

const MONTH_ALIASES: Record<string, number> = {
  baisakh: 1,
  baishak: 1,
  vaisakh: 1,
  jeth: 2,
  jyeshtha: 2,
  jesth: 2,
  ashadh: 3,
  ashadha: 3,
  asar: 3,
  asadh: 3,
  aashadh: 3,
  shravan: 4,
  shraawan: 4,
  sawan: 4,
  saun: 4,
  sravan: 4,
  bhadau: 5,
  bhado: 5,
  aswin: 6,
  asoj: 6,
  asojh: 6,
  ashvin: 6,
  mangshir: 8,
  mansir: 8,
  marga: 8,
  poush: 9,
  push: 9,
  paus: 9,
  fagun: 11,
  phalgun: 11,
  phagan: 11,
  chait: 12,
  जेष्ठ: 2,
  ज्येष्ठ: 2,
  आषाढ: 3,
  अषाढ: 3,
  श्रावण: 4,
  सावन: 4,
  भाद्र: 5,
  भादो: 5,
  आश्विन: 6,
  मङ्सिर: 8,
  मार्ग: 8,
  पौष: 9,
  फाल्गुण: 11,
  फाल्गुन: 11,
  चैत्र: 12,
};

function isAscii(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) > 127) return false;
  }
  return true;
}

for (const [alias, month] of Object.entries(MONTH_ALIASES)) {
  MONTH_BY_NAME.set(isAscii(alias) ? alias.toLowerCase() : alias, month);
}

const WEEKDAY_PREFIX =
  /^(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat|आइतबार|सोमबार|मंगलबार|बुधबार|बिहीबार|बिहिबार|शुक्रबार|शनिबार|आइत|सोम|मंगल|बुध|बिही|बिहि|शुक्र|शनि)[,\s]+/i;

function cleanup(input: string): string {
  let text = toEnglishDigits(input).trim().replace(/\./g, (match, offset, source) => {
    const sourceText = String(source);
    const prev = sourceText[offset - 1] ?? '';
    const next = sourceText[offset + 1] ?? '';
    if (/\d/.test(prev) && /\d/.test(next)) return '-';
    return ' ';
  });
  text = text.replace(WEEKDAY_PREFIX, '');
  text = text.replace(/वि\.?\s*सं\.?/g, ' ');
  text = text.replace(/बि\.?\s*सं\.?/g, ' ');
  text = text.replace(/\bB\.?\s*S\.?\b/gi, ' ');
  text = text.replace(/गते/g, ' ');
  text = text.replace(/साल/g, ' ');
  text = text.replace(/[,،।]/g, ' ');
  return text.replace(/\s+/g, ' ').trim();
}

function parseDay(token: string): number | null {
  const match = /^(\d{1,2})(?:st|nd|rd|th)?$/i.exec(token);
  if (!match?.[1]) return null;
  return Number(match[1]);
}

function parseYear(token: string): number | null {
  if (!/^\d{4}$/.test(token)) return null;
  return Number(token);
}

function parseMonth(token: string): number | null {
  const trimmed = token.replace(/[.]/g, '');
  const key = isAscii(trimmed) ? trimmed.toLowerCase() : trimmed;
  return MONTH_BY_NAME.get(key) ?? null;
}

function partsFromNumbers(year: number, month: number, day: number): DateParts | null {
  if (month < 1 || month > 12 || day < 1 || day > 32) return null;
  return { year, month, day };
}

function parseCleaned(text: string): DateParts | null {
  const ymd = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(text);
  if (ymd?.[1] && ymd[2] && ymd[3]) {
    return partsFromNumbers(Number(ymd[1]), Number(ymd[2]), Number(ymd[3]));
  }
  const dmy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(text);
  if (dmy?.[1] && dmy[2] && dmy[3]) {
    return partsFromNumbers(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));
  }

  const tokens = text.split(' ');
  if (tokens.length !== 3) return null;
  const [first, second, third] = tokens;
  if (!first || !second || !third) return null;

  const yearFirst = parseYear(first);
  const monthMiddle = parseMonth(second);
  const dayLast = parseDay(third);
  if (yearFirst !== null && monthMiddle !== null && dayLast !== null) {
    return partsFromNumbers(yearFirst, monthMiddle, dayLast);
  }

  const dayFirst = parseDay(first);
  const monthSecond = parseMonth(second);
  const yearLast = parseYear(third);
  if (dayFirst !== null && monthSecond !== null && yearLast !== null) {
    return partsFromNumbers(yearLast, monthSecond, dayFirst);
  }

  const monthFirst = parseMonth(first);
  const daySecond = parseDay(second);
  const yearThird = parseYear(third);
  if (monthFirst !== null && daySecond !== null && yearThird !== null) {
    return partsFromNumbers(yearThird, monthFirst, daySecond);
  }

  return null;
}

/**
 * Parse a BS date string. Numeric forms are `YYYY-MM-DD` and `DD-MM-YYYY`
 * with `-`, `/`, or `.` separators. Named months are accepted in Nepali or English.
 * Devanagari digits, a leading weekday, `गते`, `साल`, and `BS` are ignored as decoration.
 */
export function parseBs(input: string): DateParts {
  if (typeof input !== 'string') {
    throw new NepalDateKitError('PARSE_ERROR', 'BS date text must be a string.');
  }
  const cleaned = cleanup(input);
  if (!cleaned) throw new NepalDateKitError('PARSE_ERROR', 'BS date text is empty.');
  const parts = parseCleaned(cleaned);
  if (!parts) {
    throw new NepalDateKitError(
      'PARSE_ERROR',
      `Could not parse "${input}" as a BS date. Expected a form like 2083-07-17, 17/07/2083, or 17 Kartik 2083.`,
    );
  }
  assertValidBs(parts);
  return parts;
}
