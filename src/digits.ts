const NEPALI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'] as const;

/** Replace ASCII digits with Devanagari digits. Other characters are left as they are. */
export function toNepaliDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => NEPALI_DIGITS[Number(digit)] ?? digit);
}

/** Replace Devanagari digits with ASCII digits. Other characters are left as they are. */
export function toEnglishDigits(value: string): string {
  return value.replace(/[०-९]/g, (digit) => String(digit.charCodeAt(0) - 0x0966));
}
