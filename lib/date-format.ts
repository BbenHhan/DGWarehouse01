// Formats ISO dates into the Thai, Buddhist-year style used across the app
// (e.g. "8 มิ.ย. 2569"). Renamed from lib/week-format.ts as part of
// specs/018-per-photo-dates — formatThaiDate is now the primary export
// (a photo has one date, not a range); formatThaiDateRange is kept only for
// the browse page's date-range filter bar, which still needs to describe a
// range when both ends are set.

const THAI_MONTHS_ABBR = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

function parseIsoDate(value: string): { day: number; month: number; buddhistYear: number } | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  return { day: Number(day), month: Number(month) - 1, buddhistYear: Number(year) + 543 };
}

export function formatThaiDate(date: string): string | null {
  const parsed = parseIsoDate(date);
  if (!parsed) return null;
  return `${parsed.day} ${THAI_MONTHS_ABBR[parsed.month]} ${parsed.buddhistYear}`;
}

export function formatThaiDateRange(startDate: string, endDate: string): string | null {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  if (!start || !end) return null;

  const startMonthName = THAI_MONTHS_ABBR[start.month];
  const endMonthName = THAI_MONTHS_ABBR[end.month];

  if (start.buddhistYear === end.buddhistYear && start.month === end.month) {
    if (start.day === end.day) {
      return `${start.day} ${startMonthName} ${start.buddhistYear}`;
    }
    return `${start.day}-${end.day} ${startMonthName} ${start.buddhistYear}`;
  }

  if (start.buddhistYear === end.buddhistYear) {
    return `${start.day} ${startMonthName} - ${end.day} ${endMonthName} ${end.buddhistYear}`;
  }

  return `${start.day} ${startMonthName} ${start.buddhistYear} - ${end.day} ${endMonthName} ${end.buddhistYear}`;
}
