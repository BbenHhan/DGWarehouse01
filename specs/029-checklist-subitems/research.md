# Research: Checklist Sub-Items

## Decision 1: A self-referencing `parent_id` on `checklist_items`, not a separate `checklist_sub_items` table

**Decision**: Add a single nullable `parent_id uuid references checklist_items(id) on delete cascade` column to the existing `checklist_items` table. A sub-item is a normal `checklist_items` row whose `parent_id` is set; it uses the exact same `checklist_item_rooms` junction table for its own room tags.

**Rationale**: A sub-item needs every field a top-level item already has — text, done state, its own room tags (FR-001/FR-002) — so it's the same entity shape, not a stripped-down one. A separate table would duplicate the whole schema (including a second junction table for its room tags) for no benefit, and would make "delete a parent, delete its sub-items" need an explicit cascade instead of getting it free from one FK. `ON DELETE CASCADE` on `parent_id` also gives the "deleting a parent deletes its sub-items" edge case for free, same pattern already used for `checklist_item_rooms` in specs/028.

**Alternatives considered**: Separate `checklist_sub_items` table — rejected for the duplication reason above. A `sub_items jsonb` column embedding the children directly on the parent row — rejected because sub-items need their own room-tag joins and their own independently-toggleable rows (FR-002), which a JSON blob can't participate in a relational join for.

## Decision 2: Nesting is capped at one level by convention, not by a database constraint

**Decision**: The application layer never sets `parent_id` on a row that already has a non-null `parent_id` of its own (enforced in the `addChecklistItem`/`addSubChecklistItem` Server Action, not the schema).

**Rationale**: FR-009 asks for exactly one level. A `CHECK` constraint expressing "my parent's parent must be null" isn't expressible as a simple column-level check in Postgres without a trigger (it needs to look up another row), which is more machinery than a single-level cap justifies. The UI itself only ever offers "add a sub-item" on a top-level row (never on a sub-item row), so the deeper case is structurally unreachable through the app; a trigger would only guard against direct API misuse, which isn't a real threat model for this single-user tool (Constitution VII).

## Decision 3: Parent/sub auto-sync happens inside `toggleChecklistItem`, computed from sibling state — not a stored "all done" flag

**Decision**: `toggleChecklistItem` keeps computing and writing only the toggled row's own `is_done`. When the toggled row has a `parent_id`, it additionally re-reads all of that parent's sub-items and sets the parent's `is_done` to `true` only if every sibling is now done, `false` otherwise. When the toggled row itself is a parent (no `parent_id`, and it has sub-items), it additionally writes the same `is_done` to every one of its sub-items in the same action.

**Rationale**: FR-003 (upward auto-complete/auto-reopen) and FR-004 (downward cascade) both describe *derived* consistency between a parent and its children, not new independent state — recomputing from the actual sibling rows on every toggle is simple, always correct, and needs no extra column or background job. The alternative (a cached `all_subs_done` flag) would need invalidation on every sibling toggle anyway, which is exactly what this decision already does, just without the redundant flag to keep in sync.

## Decision 4: Room-box visibility for a sub-item is "explicit tags override, empty tags inherit the parent's rooms" — resolved in the data layer, not the component

**Decision**: `getRoomChecklistItems(roomId)` fetches (a) top-level items tagged to `roomId` and not done — unchanged from specs/028 — then (b) every not-done sub-item of those parents, and keeps a sub-item only if it has no room tags of its own, or `roomId` is among its own tags. The filtered result is attached to each parent as `sub_items`.

**Rationale**: FR-006 is a business rule about what counts as "relevant to this room," which belongs in the data layer alongside every other DATA_SOURCE-branching rule in `lib/data.ts` (Constitution III) — not duplicated inside `RoomChecklistBox` for every backend. Computing it there also means the sitewide `/checklist` page (which shows every sub-item regardless of tags, since it isn't room-scoped) and the room box (which needs the filtered subset) can both build on the same `getChecklistItems`-style query shape without the visibility rule leaking into UI code.

## Decision 5: `ChecklistItem.sub_items` is populated only on the item returned from `getChecklistItems`/`getRoomChecklistItems`; a sub-item's own `sub_items` is always `[]`

**Decision**: The existing flat `ChecklistItem` type gains `parent_id: string | null` and `sub_items: ChecklistItem[]`. Both `lib/data.ts` functions return only top-level items at the array's root, each carrying its sub-items nested inside; a sub-item never appears as a top-level array entry.

**Rationale**: Every consumer (`ChecklistList`, `RoomChecklistBox`) wants to render "one card per task, its steps nested inside" — returning a pre-nested tree means neither component needs its own parent_id-grouping logic, keeping the one-level-only invariant (Decision 2) visible in the data shape itself instead of re-derived by every reader.
