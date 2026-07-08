# Phase 0 Research: Delete Week

## Decision 1: Where the delete control lives on the card

**Decision**: Extract the week card's delete control into a small client component
(`DeleteWeekButton`), rendered as a sibling to the existing full-card `<Link>`
(absolutely positioned on top, with `onClick={(e) => e.stopPropagation()}` on its
wrapper), rather than nesting a `<button>` inside the `<Link>`.

**Rationale**: `WorkTypeWeekNav` is currently a plain Server Component (no client
state) whose entire card is one `<Link>`. Nesting an interactive `<button>` with its
own `AlertDialog`/`useTransition` inside an `<a>` is invalid HTML and breaks click
handling. `PhotoGrid` and `DocList` already solve this exact problem for their
edit/delete buttons: the whole tile is a `<button>`/`<Link>` for navigation, and the
action buttons are absolutely-positioned siblings with click-propagation stopped.
This feature reuses that established pattern instead of inventing a new one.

**Alternatives considered**:
- Convert `WorkTypeWeekNav` entirely to a client component and inline the delete
  logic — rejected: unnecessarily converts a page-level Server Component
  responsible for data-driven rendering into a client bundle, when the existing
  small-client-component extraction pattern (`AddWeekButton`, `EditModal`) already
  handles exactly this kind of narrow interactive island cleanly.

## Decision 2: Cascade deletion mechanics per backend

**Decision**: `localDeleteWeek` (local backend) removes the week row, then removes
every `Photo` row whose `week_id` matches, deleting each one's underlying file from
disk the same way `localDeletePhoto` already does (loop + reuse the existing
`deleteUploadedFile` helper). The Supabase branch (not live) fetches the week's
photos first, deletes their Storage objects via `supabase.storage.from("photos").remove(...)`,
then deletes the week row — the existing `photos.week_id` foreign key already has
`on delete cascade` (`supabase/migrations/0001_schema.sql`), so the photo *rows*
are removed automatically by Postgres, but the Storage *objects* are not (Postgres
FK cascade has no knowledge of Storage), so those must still be deleted explicitly
before/around the row delete, mirroring how `deletePhoto` already handles the
row+Storage split today.

**Rationale**: Matches the existing per-backend split for `deletePhoto` exactly —
no new deletion strategy is introduced, just applied at the week level (delete all
of a week's photos the same way one photo is deleted today, then delete the week
itself).

**Alternatives considered**:
- Rely solely on Postgres FK cascade for everything — rejected: would silently
  leave orphaned files in Supabase Storage (FK cascade only touches DB rows), which
  directly violates FR-004/SC-002 ("no file from a deleted week remains
  accessible").

## Decision 3: Confirmation dialog copy when the week has files

**Decision**: The `AlertDialog` description text branches on whether `photoCount >
0`: if so, it explicitly states the number of files that will also be deleted (e.g.
"สัปดาห์นี้มี 3 ไฟล์ — ไฟล์ทั้งหมดจะถูกลบไปด้วย"); if zero, it uses the same generic
"cannot be undone" wording already used for photo/document delete.

**Rationale**: FR-003 requires the dialog to make the file-cascade consequence
explicit, not just imply it — a user deleting a week with real progress photos in
it needs to see that consequence spelled out before confirming, not discover it
after the fact.

**Alternatives considered**:
- Same generic wording regardless of file count — rejected: fails FR-003's explicit
  requirement and risks an accidental, unrecoverable loss of real photos with no
  warning distinguishing it from deleting an empty week.
