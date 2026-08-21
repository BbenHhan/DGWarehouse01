// Pure predicate deciding whether a photo's date falls within an optional
// [from, to] range — the browsing side of specs/018-per-photo-dates (the
// upload side just attaches a single date, no range logic at all). ISO date
// strings ("YYYY-MM-DD") compare correctly with plain string <=/>=, so no
// date library is needed, consistent with this project's existing convention
// (the now-removed lib/date-range.ts's rangesOverlap used the same trick).
export type DateFilter = { from?: string; to?: string };

export function photoMatchesDateFilter(date: string, filter: DateFilter): boolean {
  const { from, to } = filter;

  // An invalid/reversed range (from after to) is treated as unfiltered rather
  // than an error or an empty result the viewer didn't intend
  // (specs/018-per-photo-dates/spec.md Edge Cases).
  if (from && to && from > to) return true;

  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}
