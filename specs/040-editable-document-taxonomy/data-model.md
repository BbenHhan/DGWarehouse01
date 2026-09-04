# Data Model: Editable Document Taxonomy

**Feature**: [spec.md](spec.md) · **Research**: [research.md](research.md) · **Date**: 2026-08-25

## document_categories (existing — unchanged shape)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `slug` | text unique | **Immutable.** Live URL segment (`/documents/structure`). Generated as `category-N` for new rows (research Decision 4); never rewritten on rename. |
| `name_th` | text not null | Editable. Must be non-blank. |
| `emoji` | text not null | Editable. |
| `sort_order` | int not null | Editable. Contiguous 1..n, renumbered on every move. |

No migration needed for the columns themselves — the table already carries everything.
What changes is that rows can now be inserted, updated, and deleted at runtime rather
than only by migration.

## document_groups (new)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `category_id` | uuid not null → `document_categories(id)` | `on delete cascade` — deleting a category takes its groups (FR-010). |
| `name_th` | text not null | Non-blank. Unique within `category_id` (FR-004, FR-012). |
| `sort_order` | int not null | Contiguous 1..n within its category. |
| `created_at` | timestamptz not null default now() | |

Constraints:

- `unique (category_id, name_th)` — the same name may exist under different categories.
- `check (btrim(name_th) <> '')` — matches how `documents.file_name` already guards blanks.
- Index on `category_id` for the per-category listing.

RLS: `authenticated` full access, matching every other table in this project
(`0008_week_cadences.sql`, `0010_checklist.sql`). Real authorization is the role check in
the Server Action, not RLS.

## documents (modified)

| Field | Change |
|---|---|
| `note` | **Dropped.** Replaced by `group_id`. |
| `group_id` | **New.** uuid null → `document_groups(id)` `on delete restrict`. Null means "belongs to no sub-group" and displays outside every group, exactly as an empty `note` does today. |

`on delete restrict` rather than cascade or set-null is deliberate: it makes the database
refuse to drop a group out from under its documents, so FR-011's "choose move or delete"
cannot be bypassed by a bug. The delete flow re-parents or deletes the documents first,
then removes the group.

## Migration outline (0014)

Ordering matters — the backfill has to read `note` before it is dropped.

1. Create `document_groups` with its constraints, index, and RLS policy.
2. Insert one row per distinct `(category_id, note)` where `note` is non-null, assigning
   `sort_order` by sorting `note` as text within each category (research Decision 2).
3. Add `documents.group_id`.
4. Backfill: set each document's `group_id` from its `(category_id, note)` pair.
5. Verify before destroying anything: every document with a non-null `note` must now have
   a non-null `group_id`. Abort otherwise.
6. Drop `documents.note`.

Live data this must carry over intact (FR-006, SC-008): 33 documents, 4 categories,
7 distinct groups — 5 under `structure`, 1 under `electrical`, 1 under `environment`,
0 under `safety`. `safety` having none is the case the whole feature exists to fix; after
the migration it stays empty, and an editor creates its groups by hand.

## Derived values (not stored)

- **Document count per group / per category** — counted at read time for FR-020 and for
  the count named in the delete confirmations. Not denormalised: the numbers are small,
  and a stored counter that drifts would make FR-011a lie about how many files are about
  to be destroyed.

## TypeScript shape (`lib/types.ts`)

```text
DocumentGroup = { id, category_id, name_th, sort_order, document_count }
DocumentCategory gains nothing structurally; the page composes categories with their groups.
Document: `note: string | null` becomes `group_id: string | null`.
```

`document_count` rides on the read model rather than the table, per the note above.

## Backend parity (Constitution III)

| Backend | document_groups |
|---|---|
| `supabase` | Full implementation — the one that runs today. |
| `local` | Same contract over `db.json`; gains a `documentGroups` array beside `photos`/`documents`/`checklistItems`. Backs the test suite. |
| `mock` | Returns an empty group list and rejects every mutation, mirroring `mockGetChecklistItems`. The v7 folder snapshot has no taxonomy to expose. |
