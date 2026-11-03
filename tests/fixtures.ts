import { readFileSync } from 'node:fs';

export interface MonthFixture {
  year: number;
  month: number;
  monthNe: string;
  monthEn: string;
  days: number;
  adStart: string;
  adEnd: string;
}

export function loadMonthFixtures(): MonthFixture[] {
  const text = readFileSync(new URL('./fixtures/months.csv', import.meta.url), 'utf8');
  const [header, ...lines] = text.trim().split(/\r?\n/);
  if (!header?.startsWith('year_bs,')) {
    throw new Error('Unexpected months.csv header');
  }
  return lines.map((line) => {
    const [year, month, monthNe, monthEn, days, , adStart, adEnd] = line.split(',');
    if (!year || !month || !monthNe || !monthEn || !days || !adStart || !adEnd) {
      throw new Error(`Bad fixture row: ${line}`);
    }
    return {
      year: Number(year),
      month: Number(month),
      monthNe,
      monthEn,
      days: Number(days),
      adStart,
      adEnd,
    };
  });
}

export function nextIsoDay(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) throw new Error(iso);
  const date = new Date(Date.UTC(year, month - 1, day + 1));
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function iso(parts: { year: number; month: number; day: number }): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}
