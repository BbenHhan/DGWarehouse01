# Phase 1 Data Model: Bulk Multi-File Upload with Drag-to-Categorize

No new tables and no changes to existing ones. This feature is a new client orchestration layer plus one new Server Action over the existing `rooms`/`work_types`/`weeks`/`photos` schema (`supabase/migrations/0001_schema.sql`, unchanged).

## New Server Action: `resolveWeekForDrop`

Added to `app/actions/photos.ts`, alongside the `createWeek`/`uploadPhoto` it depends on.

```ts
async function resolveWeekForDrop(
  roomId: string,
  workTypeId: string,
  startDate: string,
  endDate: string
): Promise<ActionResult<{ weekId: string }>>
```

Behavior:
1. Same auth check as every other mutating action in this file (`assertCanEdit()` — `editor` minimum, per Constitution VII).
2. Calls the existing `getWeeks(roomId, workTypeId)` (`lib/data.ts`) and looks for an exact `(start_date, end_date)` match.
3. If found: returns `{ ok: true, data: { weekId: <existing id> } }` — no write.
4. If not found: calls the existing `createWeek(roomId, workTypeId, startDate, endDate)` verbatim and returns its result (including its existing overlap-rejection error message, unchanged) — this is the *only* place a new week can be created from this feature, and it happens through the already-built path (FR-009).

No new validation schema needed — `createWeek` already validates `roomId`/`workTypeId`/date ordering via `createWeekSchema` (`lib/validation.ts`).

## Client session state (in-browser only, never persisted as its own record)

Owned by `BulkUploadWorkspace.tsx`, matching the spec's "Upload session" and "Unsorted file" key entities:

```ts
type UnsortedFile = {
  id: string;              // client-generated (crypto.randomUUID())
  file: File;
  previewUrl: string | null; // object URL for images; null for video (icon shown instead)
  status: "waiting" | "uploading" | "error"; // no "done" — on the desktop drag
    // path a succeeded file is removed from the list immediately (spec.md's
    // "leaves the unsorted tray" wording); on the mobile path (below) status
    // returns to "waiting" instead, since the file stays reviewable
  errorMessage?: string;
  targetRoomId?: string;      // set on first assignment attempt, used by retry
  targetWorkTypeId?: string;
  confirmedFor: Array<{ roomId: string; workTypeId: string }>; // added, User
    // Story 2 revision (research.md Decision 11) — mobile-only in practice
    // (desktop's assignFiles removes the file before this could accumulate
    // more than implicitly one entry), tracks every room/work-type the
    // mobile "add" action has successfully uploaded this file into, so it
    // can be added to more than one and never silently duplicated into the
    // same one twice (FR-017)
};

type BulkUploadSession = {
  startDate: string | null;  // ISO date, set once via UploadDateRangePicker
  endDate: string | null;
  files: UnsortedFile[];
  activeRoomId: string;      // which room's work-type bins are showing (desktop)
  binCounts: Record<string, number>; // key: `${roomId}::${workTypeId}`, for the FR-012 at-a-glance counts
};
```

**Added (User Story 4)**: a `viewMode: "large" | "medium" | "list"` preference, local `useState` inside `UnsortedFileTray` itself rather than lifted into `BulkUploadSession` — it's purely how the same `files` array is rendered (research.md Decision 7), not part of what the session tracks or resolves.

`lib/upload-session.ts` (pure, unit-tested) owns the part of this that has real logic:

```ts
// key: `${roomId}::${workTypeId}::${startDate}::${endDate}`
type WeekResolutionCache = Map<string, Promise<ActionResult<{ weekId: string }>>>;

function getOrResolveWeek(
  cache: WeekResolutionCache,
  key: string,
  resolve: () => Promise<ActionResult<{ weekId: string }>>
): Promise<ActionResult<{ weekId: string }>>;

function chunkFiles(files: File[], maxPerChunk: number): File[][];
```

## Superseded component (User Story 2 revision)

`components/MobileAssignSheet.tsx` (tap-select-many + two-step bottom sheet) was deleted — replaced by `components/MobileSwipeCard.tsx` (research.md Decision 9). No data-model impact beyond the `UnsortedFile.confirmedFor` field above; the Server Actions (`resolveWeekForDrop`, `uploadPhoto`) are unchanged and are called identically from the new component.

## Reused entities (unchanged)

- **Room**, **WorkType** (`lib/types.ts`): fetched once via existing `getRooms()`/`getWorkTypes()` in the server component (`app/(app)/upload/page.tsx`) and passed down as props — same lookup lists every other page already uses.
- **Week**, **Photo** (`lib/types.ts`): created/populated exactly as they would be through the existing single-room upload page; this feature adds no fields and no new relationships.
