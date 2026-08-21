# Research: Per-Photo Dates (Replace Week Date-Ranges)

## Decision 1: `photos` gets `room_id`/`work_type_id`/`date` directly, `weeks` table dropped entirely

**Decision**: Add three columns to `photos` (`room_id`, `work_type_id`, `date`, all `not null`), drop the `week_id` column and its FK, then drop the `weeks` table. No soft-deprecation, no nullable transition period.

**Rationale**: Confirmed live this session that both `weeks` and `photos` are currently empty (the full data reset from earlier work in this session) — there is no real data to migrate, backfill, or preserve. A clean replacement is strictly simpler and safer than a phased migration that would only exist to protect data that doesn't exist. `room_id`/`work_type_id` move onto `photos` directly since nothing else supplies them once there's no parent week row to inherit them from.

**Alternatives considered**: Keeping `weeks` as a "just a date" table (one row per distinct date, still a FK) — rejected; it would just be `weeks` renamed, not removed, re-introducing exactly the "container that must be resolved/created before uploading" step the account holder asked to eliminate (spec FR-002).

## Decision 2: `week_cadences` and the entire Feature 016 surface are deleted, not deprecated

**Decision**: Drop `week_cadences` in the same migration; delete `lib/period-generator.ts`, `app/actions/cadence.ts`, `WeekPeriodPicker.tsx`, `CadenceForm.tsx`, `CadenceSettingsClient.tsx`, `app/(app)/admin/cadence/`, and the "รอบเวลาสัปดาห์" admin-menu entry.

**Rationale**: Feature 016 existed for one reason — make choosing a week date **range** fast and free of overlap conflicts. Once photos no longer belong to a range container at all, both the UI it streamlined and the conflict it prevented cease to exist. Nothing about per-photo dates needs a "cadence" (recurring interval) concept — a single date field has no analogous configuration surface. Confirmed with the account holder as explicit, acceptable scope (spec Assumptions).

**Alternatives considered**: Repurposing the cadence engine to suggest upload dates — rejected as solving a problem nobody asked for; picking "today" (already the default) covers the actual use case with zero configuration.

## Decision 3: Date-range filter semantics (spec FR-004, Edge Cases)

**Decision**: A pure function `photoMatchesDateFilter(photoDate, filter: { from?: string; to?: string })`:
- Both empty → matches everything (unfiltered).
- Only `from` set → matches `photoDate >= from`.
- Only `to` set → matches `photoDate <= to`.
- Both set and `from <= to` → matches `from <= photoDate <= to` (inclusive).
- Both set and `from > to` (an invalid/reversed range) → treated as unfiltered (matches everything), per spec's explicit edge case ("behave as if no filter is applied, rather than showing an error").

ISO date strings (`YYYY-MM-DD`) compare correctly with plain string `<=`/`>=`, so no date-library is needed — consistent with this project's existing convention (`lib/date-range.ts`'s now-deleted `rangesOverlap` used the same trick, as does `lib/period-generator.ts`, also deleted).

**Rationale**: This is the highest-value pure logic in the feature (mirrors why `rangesOverlap` and `generatePeriods` each got dedicated unit tests in Features 005/016) — a filter with 5 distinct branches (both-empty, from-only, to-only, valid-range, invalid-range) is exactly the kind of small, easy-to-get-subtly-wrong logic worth isolating and testing directly, matching this project's established pattern of unit-testing pure `lib/*.ts` date logic.

**Alternatives considered**: Filtering server-side via a Postgres query with conditional `.gte()`/`.lte()` only — still needed for the real query, but the *decision logic* (what counts as "in range," including the invalid-range edge case) is duplicated nowhere else if it's a single exported predicate the query-building code and any future client-side logic both defer to.

## Decision 4: Storage path convention for uploaded photos

**Decision**: Keep the exact same convention shape (`${scopeId}/${randomUUID()}-${sanitizedFileName}`), just changing what `scopeId` is built from: `${roomId}-${workTypeId}` instead of a week's id.

**Rationale**: Storage paths are opaque identifiers, never parsed back apart by any code — only used as a unique, collision-resistant prefix. No functional requirement depends on their exact shape, so the smallest change (swap the prefix source) is correct and avoids touching `lib/storage.ts` or the Storage bucket structure at all.

**Alternatives considered**: Prefixing by date instead (`${date}/${randomUUID()}-...`) — rejected; date is editable after upload (spec US3/FR-006), and a storage path should not need to change when a photo's date is corrected later. Room/work-type is also editable (FR-007) but Storage objects already tolerate being "orphaned" under their original prefix when moved — same as today's existing week-move behavior, where a moved photo's `storage_path` keeps its original week-scoped prefix. No regression here, just continuing existing behavior.

## Decision 5: The read-only "mock" backend's photos get a best-effort synthetic date

**Decision**: `DATA_SOURCE="mock"` reads a frozen v7 folder snapshot that was never date-structured (`Week.start_date`/`end_date` were already `undefined` for this backend even before this feature — see the original `Week` type comment). Since every mock photo is grouped under a week whose folder name embeds a Thai date-range as plain text (e.g., "สัปดาห์ที่ 6 (8-15 มิ.ย. 2569)"), `mockGetPhotos` parses that label's start date (reusing the same day/month/Buddhist-year parsing already proven in `supabase/seed/import-weekly-photos.ts`) and assigns it to every photo that was in that folder. When parsing fails (label doesn't match the expected shape), the photo falls back to a stable placeholder date so sorting/filtering code never crashes, with a comment marking it as synthetic.

**Rationale**: `DATA_SOURCE="mock"` is an explicitly read-only, already-legacy fallback (its own code comments call it a "read-only legacy view") that the account holder does not use for real work — production runs on `DATA_SOURCE="supabase"`. Rewriting real per-photo date extraction for a frozen demo snapshot would be effort spent on a mode nobody depends on for anything but Constitution III's "same contract" requirement, which this satisfies (the `Photo` type still gets a real, comparable `date` string) without inventing more precision than the source data actually has.

**Alternatives considered**: Leaving mock photos with no date (nullable) — rejected; it would violate `Photo.date`'s `not null`-shaped meaning everywhere else and force every consumer to defensively handle a case that only exists in one already-legacy mode. Building a full recursive parser to extract more precise per-photo dates from the mock folder tree — rejected as disproportionate effort for a frozen snapshot with no real stakeholder depending on its date precision.

## Decision 6: `getRoomPhotoCounts`/`getSiteStats` query `photos` directly

**Decision**: Both currently join through `weeks` to reach `room_id` (`photos.select("week_id, weeks!inner(room_id)")`) or count distinct `week_number`s for a "total weeks" stat. With `room_id` on `photos` directly, these become plain `photos.select("room_id")` and `photos.select("date")` (or simply a `count`) queries — no join needed, and "total weeks" as a site-stat concept is dropped (there are no weeks to count).

**Rationale**: Direct consequence of Decision 1 — simpler queries fall out of the schema change for free. The site-stats header chip currently showing "N สัปดาห์" (N weeks) needs to become something else meaningful (e.g., total photos only, or a distinct-date count) — kept as a small, low-risk display change bundled into this feature rather than spun out separately, since it's directly downstream of the schema change.
