import { NepalDateKitError } from './errors.js';

export interface MonthName {
  /** 1 (Baishakh) through 12 (Chaitra). */
  number: number;
  en: string;
  ne: string;
  enShort: string;
  neShort: string;
}

export interface WeekdayName {
  /** 0 Sunday through 6 Saturday. */
  number: number;
  en: string;
  ne: string;
  enShort: string;
  neShort: string;
}

/**
 * Bikram Sambat month names used by this package.
 * English spellings match the bundled month table (Aashadha, Paush, Ashwin).
 */
export const BS_MONTHS: readonly MonthName[] = [
  { number: 1, en: 'Baishakh', ne: 'वैशाख', enShort: 'Bai', neShort: 'वै' },
  { number: 2, en: 'Jestha', ne: 'जेठ', enShort: 'Jes', neShort: 'जे' },
  { number: 3, en: 'Aashadha', ne: 'असार', enShort: 'Aas', neShort: 'अ' },
  { number: 4, en: 'Shrawan', ne: 'साउन', enShort: 'Shr', neShort: 'सा' },
  { number: 5, en: 'Bhadra', ne: 'भदौ', enShort: 'Bha', neShort: 'भ' },
  { number: 6, en: 'Ashwin', ne: 'असोज', enShort: 'Asw', neShort: 'अस' },
  { number: 7, en: 'Kartik', ne: 'कार्तिक', enShort: 'Kar', neShort: 'का' },
  { number: 8, en: 'Mangsir', ne: 'मंसिर', enShort: 'Man', neShort: 'मं' },
  { number: 9, en: 'Paush', ne: 'पुष', enShort: 'Pau', neShort: 'पु' },
  { number: 10, en: 'Magh', ne: 'माघ', enShort: 'Mag', neShort: 'मा' },
  { number: 11, en: 'Falgun', ne: 'फागुन', enShort: 'Fal', neShort: 'फा' },
  { number: 12, en: 'Chaitra', ne: 'चैत', enShort: 'Cha', neShort: 'चै' },
];

export const WEEKDAYS: readonly WeekdayName[] = [
  { number: 0, en: 'Sunday', ne: 'आइतबार', enShort: 'Sun', neShort: 'आइत' },
  { number: 1, en: 'Monday', ne: 'सोमबार', enShort: 'Mon', neShort: 'सोम' },
  { number: 2, en: 'Tuesday', ne: 'मंगलबार', enShort: 'Tue', neShort: 'मंगल' },
  { number: 3, en: 'Wednesday', ne: 'बुधबार', enShort: 'Wed', neShort: 'बुध' },
  { number: 4, en: 'Thursday', ne: 'बिहीबार', enShort: 'Thu', neShort: 'बिही' },
  { number: 5, en: 'Friday', ne: 'शुक्रबार', enShort: 'Fri', neShort: 'शुक्र' },
  { number: 6, en: 'Saturday', ne: 'शनिबार', enShort: 'Sat', neShort: 'शनि' },
];

/** Gregorian month names used when a BS date is shown beside its AD date. */
export const AD_MONTHS: readonly MonthName[] = [
  { number: 1, en: 'January', ne: 'जनवरी', enShort: 'Jan', neShort: 'जन' },
  { number: 2, en: 'February', ne: 'फेब्रुअरी', enShort: 'Feb', neShort: 'फेब' },
  { number: 3, en: 'March', ne: 'मार्च', enShort: 'Mar', neShort: 'मार्च' },
  { number: 4, en: 'April', ne: 'अप्रिल', enShort: 'Apr', neShort: 'अप्रि' },
  { number: 5, en: 'May', ne: 'मे', enShort: 'May', neShort: 'मे' },
  { number: 6, en: 'June', ne: 'जुन', enShort: 'Jun', neShort: 'जुन' },
  { number: 7, en: 'July', ne: 'जुलाई', enShort: 'Jul', neShort: 'जुल' },
  { number: 8, en: 'August', ne: 'अगस्ट', enShort: 'Aug', neShort: 'अग' },
  { number: 9, en: 'September', ne: 'सेप्टेम्बर', enShort: 'Sep', neShort: 'सेप' },
  { number: 10, en: 'October', ne: 'अक्टोबर', enShort: 'Oct', neShort: 'अक्टो' },
  { number: 11, en: 'November', ne: 'नोभेम्बर', enShort: 'Nov', neShort: 'नोभ' },
  { number: 12, en: 'December', ne: 'डिसेम्बर', enShort: 'Dec', neShort: 'डिसे' },
];

export function bsMonth(month: number): MonthName {
  const info = BS_MONTHS[month - 1];
  if (!info) {
    throw new NepalDateKitError(
      'INVALID_DATE',
      `Month ${month} is invalid. BS months are 1 (Baishakh) through 12 (Chaitra).`,
    );
  }
  return info;
}
