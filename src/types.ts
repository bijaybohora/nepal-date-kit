/** A calendar day. `month` is 1–12 and `day` starts at 1. */
export interface DateParts {
  year: number;
  month: number;
  day: number;
}

export function isDateParts(value: unknown): value is DateParts {
  if (typeof value !== 'object' || value === null || value instanceof Date) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.year === 'number' &&
    typeof record.month === 'number' &&
    typeof record.day === 'number'
  );
}
