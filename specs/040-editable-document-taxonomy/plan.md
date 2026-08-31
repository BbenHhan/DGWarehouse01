# Implementation Plan: Editable Document Taxonomy

**Branch**: `main` | **Date**: 2026-08-25 | **Spec**: [spec.md](spec.md)

## Summary

Give sub-groups (หมวดย่อย) a real existence so they can be created, named, ordered, and
removed like the categories above them — then let an editor manage both levels in place on
the documents page. Today a sub-group is only text repeated on each document, which is why
it cannot exist before a file does, cannot be renamed as one thing, and has no order. One
migration replaces `documents.note` with a `document_groups` table and a `group_id`
reference; everything else follows from that.

## Technical Context

**Language/Version**: TypeScript / Next.js 15 (App Router).

**Primary Dependencies**: None new. Dialogs, selects and inputs all exist in
`components/ui/`; reordering is buttons, not a drag library (spec FR-021).

**Storage**: One migration (`0014`) — create `document_groups`, backfill it from the
distinct `(category_id, note)` pairs, add `documents.group_id`, backfill, drop `note`.

**Testing**: Vitest against the `local` backend, matching how the checklist is covered.
The disposition rules, sort-order renumbering, and name uniqueness are pure enough to test
directly; the delete dialogs get a component test in jsdom as `RoomChecklistBox` does.

**Target Platform**: Same Next.js app; phones are the primary device (Constitution IV).

**Project Type**: Web application, single Next.js project.

**Constraints**: The migration touches live production data — 33 documents across 4
categories and 7 groups. FR-006/SC-008 require every one of them to survive with its
grouping intact; this is the plan's one irreversible step.

**Scale/Scope**: One migration, one new Server Action module, one extended action, one new
data-layer read, three backends, one new client component plus edits to `DocList` and the
documents page.

## Constitution Check

*GATE: passed before Phase 0; re-checked after Phase 1 below.*

- **I. App Router Only**: ✅ No new routes — management is a mode on the existing
  `/documents/[categorySlug]` page (FR-018).
- **II. Server Actions & Supabase Client Boundary**: ✅ Every mutation is a Server Action
  in `app/actions/document-taxonomy.ts` / `app/actions/documents.ts`. No client writes.
- **III. Storage-Agnostic File Persistence**: ✅ `local` gets a full parallel
  implementation, `mock` reports an empty taxonomy. Moving a document rewrites database
  columns only and never re-keys a stored object (research Decision 5).
- **IV. Thai-First, Mobile-First**: ✅ All labels Thai; management controls are tap targets
  in the existing row layout, verified at 375px (quickstart Scenario 10).
- **V. Resilient Async UX**: ✅ Optimistic writes with revert and toast, the pattern the
  checklist already uses; every action reports failure explicitly (FR-022).
- **VI. Tailwind-Only Styling**: ✅ Utility classes only; no inline styles.
- **VII. Multi-User Auth with RBAC**: ✅ Every action gates on `requireRole("editor")`.
  Deliberately **not** `"admin"`: this principle grants the admin role exactly one power
  the editor role lacks — changing an account's role — and gating the taxonomy behind
  admin would add a second. FR-017a states this so a later change cannot drift back.
- **VIII. Universal File Attachments**: ✅ Unchanged, and a newly created category inherits
  the shared uploader with no extra wiring, which is what this principle asks for.

No violations — Complexity Tracking not needed.

### Re-check after Phase 1 design

The design added one thing worth re-testing against the constitution: deleting documents
also deletes their stored objects (contracts, `DocumentDisposition`). That is Principle
III's abstraction being used, not bypassed — the deletion goes through the same storage
layer `deleteDoc` already uses. Still no violations.

## Project Structure

### Documentation (this feature)

```text
specs/040-editable-document-taxonomy/
├── spec.md
├── plan.md              # this file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── server-actions.md
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks — not created here
```

### Source Code (repository root)

```text
supabase/migrations/
└── 0014_document_groups.sql          # NEW — table, backfill, group_id, drop note

lib/
├── types.ts                          # MODIFIED — DocumentGroup; Document.note → group_id
├── database.types.ts                 # MODIFIED — document_groups; documents column swap
├── validation.ts                     # MODIFIED — taxonomy schemas; editDocSchema gains groupId, loses note
├── data.ts                           # MODIFIED — getDocumentGroups(); getDocumentNotes() removed
├── local/store.ts                    # MODIFIED — documentGroups in db.json + CRUD
└── mock/source.ts                    # MODIFIED — empty group list, no mutations

app/actions/
├── document-taxonomy.ts              # NEW — create/rename/move/delete for both levels
└── documents.ts                      # MODIFIED — editDoc gains groupId; uploadDoc resolves/creates a group

app/(app)/documents/[categorySlug]/
└── page.tsx                          # MODIFIED — loads groups, passes role

components/
├── DocumentTaxonomyManager.tsx       # NEW — the management mode: rename, reorder, add, delete
├── DeleteTaxonomyDialog.tsx          # NEW — the move-or-delete choice and its second confirmation
└── DocList.tsx                       # MODIFIED — groups come from data, not from scanning notes;
                                      #            move control offers category + group
```

**Structure Decision**: The existing single Next.js project, unchanged. This feature adds
no layer — it is a table, an actions module, and two components slotted into the structure
Features 017/019/025/039 already established for documents.

## Phase sequencing

The spec's story priorities drive the order, with one constraint from the data: everything
depends on the migration, and the migration is the only step that cannot be undone by
editing code.

1. **Migration and read path** — `0014`, types, `getDocumentGroups`, `DocList` reading
   real groups. No UI to manage anything yet. Ends with quickstart Scenario 1 passing:
   nothing lost. This is the risk, isolated and verifiable on its own.
2. **US1 (P1) create** + **FR-023 picker** — the reported problem, fixed.
3. **US2 (P2) rename**.
4. **US6 (P3) move** — needed before deletion has anywhere to send documents.
5. **US3 (P4) reorder**.
6. **US4 (P5) add category**.
7. **US5 (P6) delete** — last, so its safeguards are built against a taxonomy that works.

Steps 2 onward are each shippable alone.

## Risks

- **The migration is irreversible in effect.** Dropping `note` after backfilling is the
  point of no return. Mitigation: step 5 of the migration verifies every document with a
  note got a `group_id` and aborts before the drop; the quickstart records a baseline
  before running it. Take a database backup first regardless.
- **A stale confirmed count.** If someone uploads between the confirmation dialog opening
  and the delete landing, the number the user agreed to is wrong. The contract makes the
  server compare `confirmedCount` against its own count and refuse on mismatch, so the
  count is a guarantee rather than a label.
- **`getDocumentNotes()` disappears.** It has exactly one caller today, so the removal is
  contained — but it is the function whose two faults triggered this feature, and leaving
  it behind would let the old behaviour creep back.
