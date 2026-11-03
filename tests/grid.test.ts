import { describe, expect, it } from 'vitest';
import { NepaliDate, NepalDateKitError, bsToAd, getMonthGrid } from '../src/index.js';

describe('month grid', () => {
  it('lays Kartik 2083 out from Sunday with today and neighbour days', () => {
    const grid = getMonthGrid(2083, 7, { today: new NepaliDate(2083, 7, 17) });
    expect(grid.weekStartsOn).toBe(0);
    expect(grid.daysInMonth).toBe(30);
    expect(grid.weeks.every((week) => week.length === 7)).toBe(true);
    expect(grid.weeks[0]?.[0]?.bs).toEqual({ year: 2083, month: 7, day: 1 });
    expect(grid.weeks[0]?.[0]?.weekday).toBe(0);
    expect(grid.weeks[0]?.[0]?.inMonth).toBe(true);
    const cells = grid.weeks.flat();
    expect(cells.filter((cell) => cell.inMonth)).toHaveLength(30);
    const today = cells.find((cell) => cell.isToday);
    expect(today?.bs).toEqual({ year: 2083, month: 7, day: 17 });
    expect(today?.ad).toEqual(bsToAd(2083, 7, 17));
    expect(today?.weekday).toBe(2);
    const trailing = cells.filter((cell) => !cell.inMonth);
    expect(trailing.map((cell) => cell.bs?.day)).toEqual([1, 2, 3, 4, 5]);
    expect(trailing[0]?.bs?.month).toBe(8);
    expect(trailing.every((cell) => cell.inRange)).toBe(true);
  });

  it('can start the week on Monday and mark a neighbour as today', () => {
    const grid = getMonthGrid(2083, 7, {
      weekStartsOn: 1,
      today: '2083-08-01',
    });
    expect(grid.weeks[0]?.[0]?.weekday).toBe(1);
    expect(grid.weeks[0]?.[0]?.inMonth).toBe(false);
    expect(grid.weeks[0]?.[6]?.bs).toEqual({ year: 2083, month: 7, day: 1 });
    const today = grid.weeks.flat().find((cell) => cell.isToday);
    expect(today?.inMonth).toBe(false);
    expect(today?.bs).toEqual({ year: 2083, month: 8, day: 1 });
  });

  it('leaves padding empty when the previous month is out of range', () => {
    const grid = getMonthGrid(2000, 1, { today: new NepaliDate(2000, 1, 1) });
    const firstWeek = grid.weeks[0];
    expect(firstWeek?.slice(0, 3).every((cell) => cell.inRange === false && cell.bs === null)).toBe(true);
    expect(firstWeek?.[3]?.bs).toEqual({ year: 2000, month: 1, day: 1 });
    expect(firstWeek?.[3]?.weekday).toBe(3);
    expect(firstWeek?.[3]?.isToday).toBe(true);
    expect(firstWeek?.slice(0, 3).map((cell) => cell.weekday)).toEqual([0, 1, 2]);
  });

  it('attaches external events without shipping any of its own', () => {
    const seen: number[] = [];
    const grid = getMonthGrid(2083, 7, {
      today: new Date(2026, 10, 3),
      events: [{ date: { year: 2083, month: 7, day: 17 }, data: 'demo' }],
      attachEvents(cell) {
        seen.push(cell.bs.day);
        return cell.bs.day === 1 ? ['start'] : undefined;
      },
    });
    const cells = grid.weeks.flat();
    const first = cells.find((cell) => cell.inMonth && cell.bs?.day === 1);
    const today = cells.find((cell) => cell.isToday);
    expect(first?.events).toEqual(['start']);
    expect(today?.events).toEqual(['demo']);
    expect(seen).not.toContain(0);
    expect(Math.min(...seen)).toBe(1);
  });

  it('rejects a bad week start', () => {
    expect(() => getMonthGrid(2083, 7, { weekStartsOn: 7 })).toThrow(NepalDateKitError);
  });
});
