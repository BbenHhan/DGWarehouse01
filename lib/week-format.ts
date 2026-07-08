// Formats a week's ISO start_date/end_date into the same Thai, Buddhist-year
// style the app already uses elsewhere (e.g. "8-15 มิ.ย. 2569"). Returns null
// when either date is missing, so callers (WorkTypeWeekNav) know to fall back
// to the legacy label-parsing path used by the "mock" backend — see
// specs/002-week-date-range-ui/research.md Decision 3.

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

export function formatWeekDateRange(startDate: string, endDate: string): string | null {
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

// Convenience wrapper for callers holding a Week-shaped object with nullable dates.
export function formatWeekDateRangeOrNull(week: {
  start_date?: string | null;
  end_date?: string | null;
}): string | null {
  if (!week.start_date || !week.end_date) return null;
  return formatWeekDateRange(week.start_date, week.end_date);
}
