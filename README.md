# nepal-date-kit

[![CI](https://github.com/bijaybohora/nepal-date-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/bijaybohora/nepal-date-kit/actions/workflows/ci.yml)

TypeScript toolkit for the Nepali **Bikram Sambat (BS)** calendar. Convert BS and AD dates, format them in Nepali or English, and build a month grid for any UI.

The package is the free, open-source core of a Nepali utilities ecosystem. It ships **month lengths and AD anchors only**. Holidays, festivals, tithi, and other event data are not included. A separate API covers that — see [A fuller API, on request](#a-fuller-api-on-request).

- Zero runtime dependencies
- ESM and CommonJS builds, with type definitions
- Works in Node 18+ and modern browsers
- Tree-shakeable (`sideEffects: false`)
- Load a newer calendar file at runtime without publishing a new version

## Install

```bash
npm install nepal-date-kit
```

The package metadata is ready to publish as `nepal-date-kit`. It is not on the npm registry yet; until then, install it from a checkout of this repository.

## Quick start

```ts
import { NepaliDate } from 'nepal-date-kit';

const today = new NepaliDate(2083, 7, 17);

today.toAD();
// { year: 2026, month: 11, day: 3 }

today.format('full', 'ne');
// मंगलबार, १७ कार्तिक २०८३

today.format('dual', 'en');
// 17 Kartik 2083 (3 Nov 2026)

today.fiscalYear().code;
// 2083/84
```

`new NepaliDate(year, month, day)`, a BS string, and `{ year, month, day }` are **BS** dates. A JavaScript `Date` is **Gregorian**. BS years in this dataset run 2000–2100 and AD years run 1943–2044, so the numbers overlap. Pass Gregorian strings through `NepaliDate.fromAD` or `adToBs`.

```ts
import { NepaliDate, adToBs, bsToAd } from 'nepal-date-kit';

bsToAd(2000, 1, 1); // { year: 1943, month: 4, day: 14 }
adToBs('2026-11-03'); // { year: 2083, month: 7, day: 17 }

NepaliDate.fromAD(new Date(2026, 10, 3)).toString(); // 2083-07-17
NepaliDate.today(); // BS date for the local calendar day
```

Months are **1 through 12** (Baishakh … Chaitra). Weekdays are **0 through 6** (Sunday … Saturday), the same numbering as `Date#getDay()`.

`YYYY-MM-DD` strings are calendar dates, not UTC instants. `Date` objects are read and written in **local** time: `toDate()` returns local midnight on the Gregorian day.

## Formatting

```ts
import { NepaliDate, formatBs, toNepaliDigits, toEnglishDigits } from 'nepal-date-kit';

const date = new NepaliDate(2083, 7, 17);
```

17 Kartik 2083 is Tuesday, 3 November 2026. The AD half of `dual` is calculated from the calendar table.

| Preset | English | Nepali |
| --- | --- | --- |
| `full` | `Tuesday, 17 Kartik 2083` | `मंगलबार, १७ कार्तिक २०८३` |
| `long` | `17 Kartik 2083` | `१७ कार्तिक २०८३` |
| `iso` | `2083-07-17` | `2083-07-17` |
| `slash` | `2083/07/17` | `2083/07/17` |
| `dmy` | `17/07/2083` | `17/07/2083` |
| `short` | `17 Kar 2083` | `१७ का २०८३` |
| `monthYear` | `Kartik 2083` | `कार्तिक २०८३` |
| `gate` | `17 Kartik 2083 BS` | `२०८३ साल कार्तिक १७ गते` |
| `dual` | `17 Kartik 2083 (3 Nov 2026)` | `१७ कार्तिक २०८३ (३ नोभ २०२६)` |
| `relative` | `3 days ago` | `३ दिन अघि` |
| `fiscal` | `FY 2083/84` | `आ.व. २०८३/८४` |

```ts
date.format('full', 'ne');
date.format('dual', 'en');
formatBs({ year: 2083, month: 7, day: 17 }, 'long', 'en');

date.format('relative', { locale: 'ne', now: new NepaliDate(2083, 7, 20) });
// ३ दिन अघि
```

`iso`, `slash`, and `dmy` always use ASCII digits so they round-trip through parsers. Other Nepali presets use Devanagari digits. Relative phrases also use `आज` / `today`, `हिजो` / `yesterday`, and `भोलि` / `tomorrow`. Pass `now` as a `Date` (Gregorian), a `NepaliDate`, or a BS `{ year, month, day }`.

1 Kartik 2083 is a Sunday, which is the shape `आइतबार, १ कार्तिक २०८३` / `Sunday, 1 Kartik 2083`:

```ts
new NepaliDate(2083, 7, 1).format('full', 'ne');
new NepaliDate(2083, 7, 1).format('full', 'en');
```

### Custom tokens

`YYYY` `YY` `MM` `M` `DD` `D` `MMMM` `MMM` `dddd` `ddd`

```ts
date.format('dddd, D MMMM YYYY', 'en'); // Tuesday, 17 Kartik 2083
date.format('YY/MM/DD', 'ne'); // ८३/०७/१७
date.format('[BS] YYYY'); // BS 2083
```

In a custom pattern, `ne` uses Devanagari digits. Text inside `[brackets]` is copied through.

```ts
toNepaliDigits(2083); // २०८३
toEnglishDigits('२०८३-०७-१७'); // 2083-07-17
```

English month spellings follow the bundled table: Baishakh, Jestha, Aashadha, Shrawan, Bhadra, Ashwin, Kartik, Mangsir, Paush, Magh, Falgun, Chaitra. Names are exported as `BS_MONTHS`, `WEEKDAYS`, and `AD_MONTHS`.

## Parsing

```ts
import { parseBs, NepaliDate } from 'nepal-date-kit';

parseBs('2083-07-17');
parseBs('17/07/2083');
parseBs('2083.07.17');
parseBs('१७ कार्तिक २०८३');
parseBs('Sunday, 17 Kartik 2083');
parseBs('२०८३ साल कार्तिक १७ गते');
parseBs('वि.सं. 2083-07-17');

NepaliDate.parse('17 Kartik 2083');
```

A leading weekday, `गते`, `साल`, `BS`, and `वि.सं.` / `बि.सं.` are decoration. The weekday is not checked against the date. Common English spellings such as `Asoj`, `Poush`, and `Ashadh` are accepted. Separators `-`, `/`, and `.` work for both `YYYY-MM-DD` and `DD-MM-YYYY`.

## NepaliDate

```ts
const date = new NepaliDate(2083, 7, 17);

date.year;
date.month;
date.day;
date.weekday; // 2, Tuesday
date.isVerified;

date.addDays(14); // 2083-08-01
date.addMonths(1);
date.addYears(1);
date.subtractDays(1);
date.subtractMonths(1);
date.subtractYears(1);

date.diff(new NepaliDate(2083, 7, 14), 'days'); // 3
date.diff(new NepaliDate(2083, 6, 17), 'months'); // 1
date.compare(new NepaliDate(2083, 8, 1)); // -1, 0, or 1
date.isBefore(new NepaliDate(2084, 1, 1));
date.isAfter(new NepaliDate(2080, 1, 1));
date.isSame({ year: 2083, month: 7, day: 17 });

date.startOfMonth();
date.endOfMonth();
date.daysInMonth();
NepaliDate.daysInMonth(2083, 7); // 30
NepaliDate.isValid(2083, 7, 32); // false

date.toDate(); // local Date
date.toAD();
date.toBS();
```

Arithmetic returns a new `NepaliDate`. Adding months or years clamps the day when the destination month is shorter (Jestha 32, 2000 becomes Jestha 31, 2001).

`diff(other, 'days')` is the exact number of days (`this - other`). `'months'` and `'years'` are calendar units: `(year, month)` distance, without looking at the day.

Out-of-range dates throw `NepalDateKitError` with `code: 'OUT_OF_RANGE'`. Impossible days (Kartik 32, 31 February) use `INVALID_DATE`. Text that is not a date uses `PARSE_ERROR`.

## Fiscal year

The Nepal fiscal year starts on **1 Shrawan** (month 4) and ends on the last day of **Aashadha** (month 3) in the next BS year.

| BS date | Fiscal year |
| --- | --- |
| 32 Aashadha 2083 | `2082/83` |
| 1 Shrawan 2083 | `2083/84` |
| 31 Aashadha 2000 | `1999/00` |
| 1 Shrawan 2100 | `2100/01` |

```ts
new NepaliDate(2083, 4, 1).fiscalYear();
// { startYear: 2083, endYear: 2084, endYearShort: '84', code: '2083/84' }

new NepaliDate(2083, 4, 1).format('fiscal', 'ne'); // आ.व. २०८३/८४
new NepaliDate(2083, 4, 1).format('fiscal', 'en'); // FY 2083/84
```

## Accuracy

Built-in data covers **BS 2000–2100** (AD 1943-04-14 through 2044-04-13).

- Years **through BS 2086** were cross-checked. `isVerifiedYear(2086)` is `true`.
- Years **BS 2087–2100** are included so programs keep working, but published sources disagree by a day in some months. `isVerifiedYear(2087)` is `false`. Confirm those years against the official calendar of the **Nepal Panchang Nirnayak Samiti**.

```ts
import { getDateAccuracy, isVerifiedYear } from 'nepal-date-kit';

isVerifiedYear(2086); // true
isVerifiedYear(2087); // false
getDateAccuracy(2087).warning;
// BS 2087 is not in the verified range (through 2086). Confirm it against the Nepal Panchang Nirnayak Samiti calendar before relying on it.
```

`nepali-date-converter` (npm) and `nepali-datetime` (PyPI) disagree with this dataset around BS 2062 Baishakh/Jestha and in parts of 2087 onward. Conversion here follows `data/bs-month-lengths.json`. When you have a corrected table, load it with `loadCalendarData` instead of waiting for a new release.

## Calendar data and the importer

The active table starts as the file shipped with the package. You can replace or extend it at runtime. The document is month lengths plus the AD date of 1 Baishakh each year. A `festivals` (or any other extra) field is rejected.

```ts
import { loadCalendarData, resetCalendarData, validateCalendarData } from 'nepal-date-kit';

const result = validateCalendarData(jsonTextOrObject);
if (!result.ok) {
  console.error(result.errors);
} else {
  loadCalendarData(result.data, { mode: 'merge' });
}

resetCalendarData(); // back to the built-in table
```

`validateCalendarData` checks the shape **and** the calendar chain: years are contiguous, each month is 29–32 days, and each `adStartOfYear` is the Gregorian day after the previous year ends. The JSON Schema checks the shape for editors and API payloads. It does not check the chain.

`loadCalendarData(data, { mode: 'merge' })` overlays years onto the table that is already active. A failed load leaves that table unchanged. The verified-year watermark moves forward only when the incoming file contains every year from the current watermark through its own `verifiedThrough`. Adding BS 2101 by itself does not mark 2087–2101 as verified.

`{ mode: 'replace' }` discards the active table and uses the file alone.

JSON Schema: [`schema/calendar-data.schema.json`](schema/calendar-data.schema.json), also exported as `nepal-date-kit/schema.json`.

Built-in month lengths are compiled into the package. In this repository the source file is [`data/bs-month-lengths.json`](data/bs-month-lengths.json). `getBuiltinCalendarData()` returns that table at runtime. The raw file is not part of the npm tarball.

```json
{
  "format": "nepal-date-kit/calendar-data",
  "version": 1,
  "source": "Who checked these lengths",
  "anchor": { "bs": "2000-01-01", "ad": "1943-04-14" },
  "verifiedThrough": 2086,
  "unverifiedYears": "2087-2100: confirm against the Nepal Panchang Nirnayak Samiti calendar",
  "years": {
    "2000": {
      "months": [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
      "adStartOfYear": "1943-04-14"
    }
  }
}
```

| Field | Meaning |
| --- | --- |
| `format` | Always `"nepal-date-kit/calendar-data"`. |
| `version` | Always `1`. |
| `anchor.bs` | `YYYY-01-01` of the earliest year in `years`. |
| `anchor.ad` | Gregorian date of that day. Same value as that year's `adStartOfYear`. |
| `verifiedThrough` | Last BS year in **this file** that you have checked. Must be one of the years in the file. |
| `years[year].months` | Twelve integers, Baishakh through Chaitra, each 29–32. |
| `years[year].adStartOfYear` | Gregorian `YYYY-MM-DD` of 1 Baishakh. |

Correcting a month length also means updating `adStartOfYear` for every later year you include. A one-year patch is valid on its own, and merge rejects it if it no longer lines up with the next year already in memory.

`getCalendarMeta()` returns the active range, anchor, and `verifiedThrough`. `getCalendarData()` and `getBuiltinCalendarData()` return clones.

## Month grid

`getMonthGrid` returns weeks a UI can render. It does not bundle events. Pass your own, or fill them from a hook.

```ts
import { getMonthGrid } from 'nepal-date-kit';

const grid = getMonthGrid(2083, 7, {
  weekStartsOn: 0, // Sunday. Use 1 for Monday.
  today: new Date(2026, 10, 3),
  events: [{ date: { year: 2083, month: 7, day: 17 }, data: { name: 'Demo' } }],
  attachEvents(cell) {
    return cell.isToday ? [{ name: 'Today' }] : undefined;
  },
});

grid.weeks.forEach((week) => {
  week.forEach((cell) => {
    if (!cell.inRange || !cell.bs) return;
    const { year, month, day } = cell.bs;
    // cell.ad, cell.weekday, cell.isToday, cell.inMonth, cell.events
    console.log(year, month, day, cell.inMonth);
  });
});
```

Each week has 7 cells. Leading and trailing days come from the neighbouring months. Padding before BS 2000 (1 Baishakh 2000 was a Wednesday) is `{ inRange: false, bs: null, ad: null }`.

## Errors

```ts
import { NepalDateKitError, bsToAd } from 'nepal-date-kit';

try {
  bsToAd(2101, 1, 1);
} catch (error) {
  if (error instanceof NepalDateKitError) {
    error.code; // OUT_OF_RANGE | INVALID_DATE | INVALID_DATA | PARSE_ERROR
    error.message;
  }
}
```

Messages name the supported range of the table that is currently loaded. After `loadCalendarData`, that range can be wider or narrower than BS 2000–2100.

## A fuller API, on request

Holidays, festivals, tithi, and richer calendar data are offered separately. They are intentionally not part of this package.

**Contact:** [beecodeguy@gmail.com](mailto:beecodeguy@gmail.com) · <https://beecodeguy.com>

## Development

```bash
npm install
npm test
npm run lint
npm run typecheck
npm run build
```

`npm run check` runs lint, types, tests, and the build. GitHub Actions runs the same steps and then imports the ESM and CJS bundles.

## License

[MIT](LICENSE) © 2026 Bijay Bohora
