// Two weeks in the same room/work-type must not cover overlapping dates
// (specs/002-week-date-range-ui, confirmed via /speckit-clarify). Half-open
// interval overlap check: ranges [aStart, aEnd] and [bStart, bEnd] overlap
// (inclusive) whenever aStart <= bEnd && bStart <= aEnd.
//
// Extracted out of app/actions/photos.ts (specs/005-automated-testing) so
// this pure date-math rule can be unit-tested directly, without going
// through a "use server" Server Action that depends on Next.js request-scoped
// APIs (cookies(), revalidatePath()) a plain test runner can't provide.
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}
