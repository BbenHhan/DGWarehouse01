# Research: Sub-group Requirement Checklist

No NEEDS CLARIFICATION items remained in the spec. These are the design decisions the plan
depends on.

## Decision 1 — Requirement items live in their own table

**Decision**: A `document_group_requirements` table, one row per item, referencing its
sub-group with `on delete cascade`.

**Rationale**: Items are edited one at a time — a status flip, a note — and reordered.
Rows make each of those a single-row write with no read-modify-write of a whole list, so
two editors touching different items never overwrite each other. Cascade delivers FR-015
(the items go with their sub-group) in the database itself. Row-level policies match every
other table.

**Alternatives considered**: A JSON array column on `document_groups` — one write per
change, but every change rewrites the whole list, concurrent edits silently drop each
other's changes, and ordering and validation move into application code. Rejected.

## Decision 2 — Status is a three-value code, labelled in Thai at the edge

**Decision**: Store `have` | `missing` | `waiting` with a check constraint. One module,
`lib/requirement-status.ts`, maps each to its Thai label (มีแล้ว / ยังขาด / รอดำเนินการ),
an icon (check / cross / clock) and a tone.

**Rationale**: Mirrors the checklist's `todo` / `in_progress` / `done`. Keeping the label,
icon and tone in one map means the read view and the editor cannot disagree, and the icon
plus label is what satisfies FR-005 (not colour alone).

**Alternatives considered**: Thai strings in the database — breaks the moment wording
changes. A boolean plus nullable "waiting reason" — cannot express waiting without a note.

## Decision 3 — Status is set by a person; items are not linked to files

**Decision**: No automatic status and no document foreign key. The note carries the file
name when it helps.

**Rationale**: Spec assumptions. A file's presence does not prove the requirement is met
(the SUZUYO reports), and documents move between sub-groups often enough that a link would
point at the wrong place.

## Decision 4 — The code must work before the migration is applied

**Decision**:
- `getGroupRequirements` returns an empty result when the table does not exist (PostgREST
  `PGRST205`, Postgres `42P01`) and rethrows every other error.
- `description` stays optional on the types, so a row without the column renders as no
  description.
- A write attempted before the migration fails with a Thai message saying the checklist
  is not enabled yet, rather than a raw database error.

**Rationale**: There is no DDL path from this machine; the account holder applies the
migration by hand, and the deploy may reach production first. Without this, deploying the
code would take the whole category page down until the SQL is run. The fallback is
narrow — only "table missing" is swallowed — so a real outage still surfaces.

**Alternatives considered**: Gating on a feature flag — one more thing to flip, and it
still needs the missing-table handling for the window between deploy and flip.

## Decision 5 — The หมวด 6 content ships inside the migration, idempotently

**Decision**: The migration sets each description only where it is still null, and
inserts a sub-group's items only when that sub-group has none. Sub-groups are matched by
`(category slug 'checklist-permit', name_th)`; a name that no longer exists matches
nothing.

**Rationale**: One paste into the SQL Editor does everything, and running it twice changes
nothing (FR-018, spec US3 scenario 3). "Only where empty" also means a re-run can never
overwrite edits made in the app after the first run. Matching by name follows the draft's
reasoning: ids differ between environments, names are unique within a category, and a
renamed sub-group is skipped instead of receiving the wrong items (US3 scenario 2).

**Alternatives considered**: A separate Node seed script over the REST API — a second
step to remember, and it would need its own idempotency. Upserting by name — would
overwrite in-app edits on re-run.

## Decision 6 — The seed is tested against the spec appendix

**Decision**: `lib/requirement-seed.test.ts` parses the appendix tables in `spec.md` and
the `values` rows in the migration, and asserts they are identical: same sub-groups, same
descriptions, same items in the same order with the same statuses and notes.

**Rationale**: SC-002 requires 100% fidelity to the appendix, and 45 hand-copied rows are
exactly where a dropped line or swapped status hides. The test is also what keeps the spec
and the SQL from drifting if either is edited.

## Decision 7 — Items render outside the collapse trigger

**Decision**: The sub-group row becomes: header (collapse trigger: number, name, file
count, chevron), then the description and item list — always visible — then the
collapsible file list.

**Rationale**: The trigger is a `<button>`; a list inside a button is invalid markup and
confuses screen readers. Placing the block between trigger and content keeps it visible
without expanding (FR-004) and keeps the trigger what it is.

## Decision 8 — Status is edited with three tap targets

**Decision**: In management mode each item shows a three-button segmented control
(มีแล้ว / ยังขาด / รอ) with `aria-pressed`, not a select.

**Rationale**: One tap on a phone, the current state is visible without opening anything,
and it meets SC-003 (record an arrival in under 30 seconds). A select needs two taps and a
native picker.

## Decision 9 — Requirements are read separately from sub-groups

**Decision**: New `getGroupRequirements(categoryId)` returning items grouped by sub-group
id; `DocumentGroup` gains only the optional `description`.

**Rationale**: `DocumentGroup` feeds the upload picker, the move picker and every
category's group list. Hanging items off it would load every item for every category on
every page for pickers that never show them.

## Decision 10 — Replace the draft migration rather than add beside it

**Decision**: Delete the uncommitted `0015_taxonomy_descriptions.sql` and write
`0015_group_requirements.sql` in its place. Keep the draft's column definitions and its
rendering in `layout.tsx` and `DocList.tsx`.

**Rationale**: The draft was never applied or committed, so nothing references its number.
Its seed describes sub-groups that no longer exist and mis-describes "ทดสอบ"; applying it
first and correcting afterwards would violate FR-019.
