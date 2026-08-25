# Data Model: Checklist Detail, Dates, Status, and Room Colors

## Schema (`supabase/migrations/0013_checklist_status_detail_dates.sql`)

```sql
alter table checklist_items
  drop column if exists is_done,
  add column if not exists status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'done')),
  add column if not exists detail text,
  add column if not exists start_date date,
  add column if not exists due_date date;

alter table checklist_item_rooms
  drop column if exists is_done,
  add column if not exists status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'done'));
```

No RLS change — same tables, same "authenticated full access" policies.

## `lib/types.ts`

```ts
export type ChecklistStatus = "todo" | "in_progress" | "done";

export type ChecklistItem = {
  id: string;
  text: string;
  detail: string | null;
  status: ChecklistStatus;
  start_date: string | null;
  due_date: string | null;
  room_ids: string[];
  room_statuses: { room_id: string; status: ChecklistStatus }[];
  parent_id: string | null;
  sub_items: ChecklistItem[];
  created_at: string;
  updated_at: string;
};
```

## `lib/checklist-status.ts` (NEW — no `server-only`, shared client+server)

```ts
export function rollupChecklistStatus(statuses: ChecklistStatus[]): ChecklistStatus {
  if (statuses.length === 0) return "todo";
  if (statuses.every((s) => s === "done")) return "done";
  if (statuses.some((s) => s !== "todo")) return "in_progress";
  return "todo";
}
```

## `lib/room-colors.ts` (NEW)

A `slug`-keyed lookup to `{ chip, row, control }` Tailwind class strings (one pastel hue per real room, neutral fallback for any other slug) plus a fixed `STATUS_COLORS` map for `todo`/`in_progress`/`done`.

## `lib/database.types.ts`

`checklist_items` Row/Insert/Update: replace `is_done` with `status: string`, add `detail: string | null`, `start_date: string | null`, `due_date: string | null` (all optional on Insert). `checklist_item_rooms` Row/Insert/Update: replace `is_done` with `status: string`.

## `app/actions/checklist.ts`

- `addChecklistItem(input: { text: string; roomIds: string[]; parentId?: string; detail?: string; startDate?: string; dueDate?: string })` — signature changes from positional to a single input object (more optional fields than is comfortable positionally). Inserts `status: 'todo'` always (a new item starts Todo).
- `setChecklistItemStatus(id: string, status: ChecklistStatus)` — replaces `toggleChecklistItem`. Writes the row's own `status`; if it has sub-items, cascades that same `status` to all of them (specs/029 FR-004, now 3-way); if it has a `parent_id`, re-syncs the parent via `rollupChecklistStatus` over all siblings (FR-003).
- `setChecklistItemRoomStatus(itemId: string, roomId: string, status: ChecklistStatus)` — replaces `toggleChecklistItemRoom`. Writes that room-tag row's `status`; recomputes+writes the item's own `status` via `rollupChecklistStatus` over all its room-tag rows; re-syncs the parent via siblings if `parent_id` is set (specs/031 Decision 5, now 3-way).
- `editChecklistItem(input)` — gains optional `detail`, `startDate`, `dueDate` alongside existing `text`/`roomIds`.
- `deleteChecklistItem` — unchanged.

## `lib/data.ts`

- `getChecklistItems()` — joined select includes `checklist_item_rooms(room_id, status)`; each returned item carries `detail`/`start_date`/`due_date`/`status`/`room_statuses`.
- `getRoomChecklistItems(roomId)` — "not done" becomes `status != 'done'` throughout (was `is_done = false`); otherwise unchanged shape from specs/031.

`lib/local/store.ts` mirrors both, using `rollupChecklistStatus` for its own recompute steps.

## UI contracts

- **`ChecklistList`**: title + optional detail line + optional "เริ่ม … · ครบกำหนด …" date line (only the parts that are set, via `formatThaiDate`) under each row. 0-room/0-sub rows get a directly-editable status `<select>` (room-agnostic, `STATUS_COLORS`-styled); 2+-room rows get a read-only status badge plus one room-colored row per tag, each with its own editable status `<select>`; 1-room rows keep a single inline status `<select>` styled with that one room's color. Add-form/edit dialog gain a detail `<textarea>` and `start`/`due` `<input type="date">` fields.
- **`RoomChecklistBox`**: the box itself and each item row are tinted with the current room's color (`lib/room-colors.ts`); each row shows the due date only if set; status control is always that room's own `setChecklistItemRoomStatus` (or, for a fully-untagged sub-item, the item-level `setChecklistItemStatus`, unchanged fallback from specs/031).
