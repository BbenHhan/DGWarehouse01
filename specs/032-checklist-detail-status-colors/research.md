# Research: Checklist Detail, Dates, Status, and Room Colors

## Decision 1: `status` (text, checked to 3 values) replaces `is_done` everywhere — one migration, both tables

**Decision**: `checklist_items.is_done` and `checklist_item_rooms.is_done` (added in migration 0012, never deployed) are dropped and replaced by `status text not null default 'todo' check (status in ('todo','in_progress','done'))` on both tables, in a single new migration.

**Rationale**: The account holder explicitly confirmed status replaces the checkbox, not sits alongside it ("ไม่ต้องมีติ๊กแล้ว" — don't need the checkbox anymore). Since migration 0012 was never applied to the live project, editing the model cleanly (new migration dropping+replacing rather than trying to preserve a boolean nobody's data depends on) costs nothing. A `check` constraint (not a Postgres enum type) matches this schema's existing convention of plain columns with app-level validation over custom Postgres types.

## Decision 2: Status rollup is 3-way, reusing the exact upward/downward sync points specs/029/031 already built

**Decision**: A single shared helper, `rollupChecklistStatus(statuses: ChecklistStatus[]): ChecklistStatus` — done iff every status is done; todo iff every status is todo; in_progress otherwise (any mix, or any already in_progress) — replaces the boolean `every(...)` checks in both `toggleChecklistItem`'s parent-sync and `toggleChecklistItemRoom`'s item-level recompute (both renamed to `setChecklistItemStatus`/`setChecklistItemRoomStatus`).

**Rationale**: This is a drop-in upgrade of the exact same sync mechanism already in place — no new event, no new sync point, just a 3-way function replacing a boolean `.every()`. Keeping the same call sites (upward to parent on any child status change; downward cascade only from an explicit top-level status set, never from a room/child rollup) preserves every existing invariant from specs/029 (FR-003/FR-004) and specs/031 (Decision 5) without re-deriving them.

## Decision 3: Room colors are a fixed, `slug`-keyed Tailwind class lookup — not a stored column, not raw hex

**Decision**: `lib/room-colors.ts` exports a lookup from a room's `slug` (stable across all three `DATA_SOURCE` backends, unlike `id` which is a real UUID only in `"supabase"` mode) to a small set of pre-defined Tailwind utility class strings (e.g. `bg-sky-100 text-sky-700`), with a neutral fallback for any room not in the table.

**Rationale**: Constitution VI (Tailwind-only styling, no inline styles) rules out per-room inline hex — the approved mockup's raw hex was only for the preview widget, which runs outside the app's own Tailwind build. Keying by `slug` rather than `id` is required for the "local"/"mock" backends, whose room ids are the slugs themselves, not UUIDs. A static lookup (not a `rooms.color` column) is enough since the room list itself is a small, fixed lookup table already hand-maintained in three places (`lib/mock/source.ts`'s `ROOMS`, the Supabase seed, and this new file) — consistent with how `groupRooms` already hand-encodes room-specific display logic (`lib/room-groups.ts`) without a schema column.

## Decision 4: Status gets its own fixed 3-color palette, independent of any room's color

**Decision**: Todo/In Progress/Done each get one fixed Tailwind class pair (e.g. gray/amber/emerald), used for the status badge and the room-agnostic (0-room, 0-sub) status selector. A per-room row (2+ rooms) uses the *room's* color for its background, with the status shown as plain text inside that row rather than a second color layer.

**Rationale**: Directly matches the approved mockup and spec FR-008 — mixing a status color into an already-room-colored row would fight for attention and undercut the "tell rooms apart by color" goal (spec User Story 3). Reserving color for exactly one axis at a time (room color on per-room rows; status color only where no room color is in play) keeps both signals legible.

## Decision 5: Dates are plain `date` columns (`YYYY-MM-DD`), formatted with the existing `formatThaiDate` helper

**Decision**: `start_date`/`due_date` are nullable Postgres `date` columns, matching `photos.date`'s existing convention (specs/018-per-photo-dates) rather than a timestamp. Display reuses `lib/date-format.ts`'s `formatThaiDate` (already used by `PhotoGrid`), not a new formatter.

**Rationale**: A checklist due date is a calendar day, not a moment in time — same reasoning as a photo's capture date. Reusing the existing Thai/Buddhist-year formatter keeps date display consistent across the whole app instead of introducing a second date-formatting convention.
