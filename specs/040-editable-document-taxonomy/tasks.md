---

description: "Task list for Editable Document Taxonomy"

---

# Tasks: Editable Document Taxonomy

**Input**: Design documents from `/specs/040-editable-document-taxonomy/`

**Tests**: Yes — plan.md commits to Vitest coverage against the `local` backend, as the checklist has. Test tasks are inlined with the story they cover, following this repo's co-located `lib/*.test.ts` convention rather than a separate `tests/` directory.

**Validation**: Every phase ends by running the matching scenario in [quickstart.md](quickstart.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel — different files, no dependency on an unfinished task
- **[Story]**: Which user story the task serves

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Give sub-groups a real existence and prove nothing was lost. No management UI yet — this phase changes where group names live, not what anyone can do.

**⚠️ This phase contains the only irreversible step in the feature. Do not start Phase 2 until T013 passes.**

- [ ] T001 Take a fresh database backup before touching anything, into `supabase/backups/<timestamp>/` (git-ignored). One JSON export per table; `documents.json` must contain the `note` column, since T012 destroys it
- [ ] T002 Create `supabase/migrations/0014_document_groups.sql` following data-model.md's migration outline: create `document_groups` (id, category_id, name_th, sort_order, created_at) with `unique (category_id, name_th)`, a non-blank check on `name_th`, an index on `category_id`, and the `authenticated` full-access RLS policy every other table in this project uses
- [ ] T003 In the same migration, insert one `document_groups` row per distinct `(category_id, note)` where `note` is non-null, assigning `sort_order` by sorting `note` as text within each category (research.md Decision 2 — the names are already numbered by hand, so a text sort reproduces the intended order)
- [ ] T004 In the same migration, add `documents.group_id uuid null references document_groups(id) on delete restrict` — `restrict`, not cascade, so the database itself refuses to drop a group out from under its documents
- [ ] T005 In the same migration, backfill `documents.group_id` from each document's `(category_id, note)` pair
- [ ] T006 In the same migration, add a verification step that aborts if any document with a non-null `note` has a null `group_id`. This guard is the difference between a failed migration and silent data loss
- [ ] T007 [P] Update `lib/types.ts`: add `DocumentGroup` (`id`, `category_id`, `name_th`, `sort_order`, `document_count`); change `Document.note: string | null` to `Document.group_id: string | null`
- [ ] T008 [P] Update `lib/database.types.ts`: add the `document_groups` table with its FK relationship to `document_categories`; swap `note` for `group_id` on `documents`
- [ ] T009 Update `lib/local/store.ts`: `LocalDb` gains a `documentGroups` array beside `photos`/`documents`/`checklistItems`; add read/create/rename/reorder/delete functions mirroring the Supabase contract; normalize any pre-existing `note`-shaped records in `loadDb()` the way the checklist's status migration did
- [ ] T010 [P] Update `lib/mock/source.ts`: add `mockGetDocumentGroups()` returning an empty array, following `mockGetChecklistItems`' precedent — the frozen v7 snapshot has no taxonomy
- [ ] T011 Update `lib/data.ts`: add `getDocumentGroups(categoryId)` returning that category's groups in `sort_order` with a document count each; **remove `getDocumentNotes()` entirely** (its two faults — only returning names some document already carried, and drawing from every category at once — are what triggered this feature); `getDocuments()` returns `group_id` in place of `note`
- [ ] T012 Apply migration 0014 to the live Supabase project (manual, Supabase SQL Editor). **Blocked on the account holder.** Run T001 first
- [ ] T013 Update `components/DocList.tsx` to build its groups from `getDocumentGroups()` instead of scanning `doc.note`, and `app/(app)/documents/[categorySlug]/page.tsx` to load them. Documents with a null `group_id` still render outside every group, exactly as an empty `note` does today
- [ ] T014 Run quickstart Scenario 1 against the real data: every category shows the same documents under the same group names as the T001 backup, totals unchanged, `safety` still empty. **Stop and fix before Phase 2 if any count differs**

**Checkpoint**: Groups are real records. The page looks identical to before — that is the point.

---

## Phase 2: User Story 1 — Lay out a category's structure before any files exist (Priority: P1) 🎯 MVP

**Goal**: An editor can create sub-topics in a category that holds nothing, and the upload form offers them.

**Independent test**: quickstart Scenarios 2 and 3.

- [ ] T015 [P] [US1] Add taxonomy schemas to `lib/validation.ts`: `createGroupSchema` (`categoryId`, non-blank trimmed `nameTh`), plus the shared non-blank/duplicate-sibling rules FR-012 requires
- [ ] T016 [US1] Create `app/actions/document-taxonomy.ts` with `createGroup`. Gate on `requireRole("editor")` — **not `"admin"`**, per FR-015/FR-017a and Constitution VII. Branch `local`/`supabase` as the checklist actions do; reject on `mock`. Revalidate `/documents` and `/documents/[categorySlug]`
- [ ] T017 [US1] Create `components/DocumentTaxonomyManager.tsx`: the management-mode toggle plus per-category add field. Rows keep their position and labels when the mode flips — only the attached controls change (FR-019). The toggle is hidden for viewers (FR-016)
- [ ] T018 [US1] Hold the add-field values in state owned by the component that stays mounted across the mode toggle, keyed by category, so unsubmitted typing survives leaving and re-entering management mode (FR-025, research.md Decision 8)
- [ ] T019 [US1] Update `components/DocUploader.tsx` to source its group picker from `getDocumentGroups(categoryId)`: every group in this category whether or not it holds files, and none from other categories (FR-023)
- [ ] T020 [US1] Update `uploadDoc` in `app/actions/documents.ts`: resolve a typed group name against existing groups in that category, creating one through the same path `createGroup` uses if it does not exist (FR-024), then attach `group_id`
- [ ] T021 [P] [US1] Create `lib/local/document-groups.test.ts`: creating a group in an empty category, uniqueness within a category, the same name allowed under two different categories, blank and whitespace-only names refused
- [ ] T022 [US1] Run quickstart Scenarios 2 and 3

**Checkpoint**: The reported problem is fixed — `หมวดที่ 4` can hold topics before it holds files, and the picker is correct.

---

## Phase 3: User Story 2 — Correct a name once, everywhere (Priority: P2)

**Goal**: Renaming is one action that touches no document.

**Independent test**: quickstart Scenario 4.

- [ ] T023 [P] [US2] Add `renameGroupSchema` and `renameCategorySchema` to `lib/validation.ts`. `renameCategorySchema` accepts `nameTh` and `emoji` only — **it must not accept `slug` at all**, so a rename cannot break a live URL (FR-013)
- [ ] T024 [US2] Add `renameGroup` and `renameCategory` to `app/actions/document-taxonomy.ts`, plus their `local` counterparts in `lib/local/store.ts`
- [ ] T025 [US2] Add inline name editing to `components/DocumentTaxonomyManager.tsx` for both levels: click the name to edit, blur to save. Clearing the field restores the previous name rather than saving a blank (FR-012)
- [ ] T026 [P] [US2] Extend `lib/local/document-groups.test.ts`: renaming a group holding documents leaves every document attached to it; renaming to a sibling's name is refused; a category rename leaves `slug` untouched
- [ ] T027 [US2] Run quickstart Scenario 4

---

## Phase 4: User Story 6 — Move documents into the right place (Priority: P3)

**Goal**: A document can be moved to any category and any group within it. Deletion in Phase 7 depends on this existing.

**Independent test**: quickstart Scenario 6.

- [ ] T028 [P] [US6] Update `editDocSchema` in `lib/validation.ts`: add `groupId?: string | null` (null meaning no sub-group), remove `note`, keep the "at least one field" rule
- [ ] T029 [US6] Update `editDoc` in `app/actions/documents.ts` to accept and apply `groupId`, and add `moveDocuments({ documentIds, toCategoryId, toGroupId })` as the bulk form Phase 7's disposition will call. Both write database columns only — `storage_path` is never rewritten (research.md Decision 5)
- [ ] T030 [US6] Update the move control in `components/DocList.tsx` from a flat category list to category plus group, with "no sub-group" as an option. Destinations are read live, so a group created moments ago is selectable without a reload (FR-026)
- [ ] T031 [P] [US6] Extend the local-store tests: moving between groups in different categories, moving to no group, counts updating on both sides, `storage_path` unchanged after a move
- [ ] T032 [US6] Run quickstart Scenario 6, including opening a moved file to confirm it still downloads

---

## Phase 5: User Story 3 — Put the list in the intended order (Priority: P4)

**Goal**: The order an editor sets is the order everyone sees.

**Independent test**: quickstart Scenario 5.

- [ ] T033 [US3] Add `moveGroup` and `moveCategory` (`{ id, direction }`) to `app/actions/document-taxonomy.ts` and `lib/local/store.ts`: swap with the neighbour, then renumber that parent's rows to a contiguous 1..n in one statement (research.md Decision 3)
- [ ] T034 [US3] Add up/down buttons per row in `components/DocumentTaxonomyManager.tsx` — buttons, not drag (FR-021: this is used on a phone on site). No "up" on the first row, no "down" on the last
- [ ] T035 [US3] Debounce rapid reorder clicks into a single write, so four fast taps settle on the order shown rather than racing (spec Edge Cases, research.md Decision 7)
- [ ] T036 [P] [US3] Extend the local-store tests: a move renumbers contiguously, moving the first row up is a no-op, moving the last down is a no-op, order survives a reload
- [ ] T037 [US3] Run quickstart Scenario 5

---

## Phase 6: User Story 4 — Add a whole new category (Priority: P5)

**Goal**: A fifth category can be created and behaves exactly like the original four.

- [ ] T038 [P] [US4] Add `createCategorySchema` to `lib/validation.ts` (`nameTh`, `emoji`) — no `slug` field; the caller never supplies one
- [ ] T039 [US4] Add `createCategory` to `app/actions/document-taxonomy.ts` and `lib/local/store.ts`, generating `slug` as `category-N` where N is the smallest positive integer not already taken (research.md Decision 4). Append last in `sort_order`
- [ ] T040 [US4] Add the "add category" control to `components/DocumentTaxonomyManager.tsx`
- [ ] T041 [P] [US4] Extend the local-store tests: slug generation skips taken numbers, a new category appears last, its slug is never regenerated on a later rename
- [ ] T042 [US4] Verify a newly created category accepts sub-groups and file uploads with no extra wiring (Constitution VIII)

---

## Phase 7: User Story 5 — Remove part of the structure, deciding what happens to the files (Priority: P6)

**Goal**: Nothing is deleted by accident, and nothing is deleted without the count being shown and confirmed.

**Independent test**: quickstart Scenario 7 — all four of its cases.

- [ ] T043 [P] [US5] Add the `DocumentDisposition` schema to `lib/validation.ts`: `{ kind: "none" } | { kind: "move", toCategoryId, toGroupId } | { kind: "delete", confirmedCount }`. There is no default — every delete call must carry a decision
- [ ] T044 [US5] Add `deleteGroup` and `deleteCategory` to `app/actions/document-taxonomy.ts` and `lib/local/store.ts`, enforcing the disposition rules **server-side, not in the UI**: `none` with documents present is refused with the real count; `move` re-parents first then removes; `delete` refuses unless `confirmedCount` matches the server's own count at call time; any refusal changes nothing at all (FR-011b)
- [ ] T045 [US5] Deleting a category removes its sub-groups in the same action (FR-010) — the `on delete cascade` from T002 plus an explicit ordering so documents are re-parented or removed before their group is
- [ ] T046 [US5] When the disposition is `delete`, remove the stored objects too, through the same storage layer `deleteDoc` already uses — deleting rows alone would orphan the files in Storage forever
- [ ] T047 [US5] Create `components/DeleteTaxonomyDialog.tsx`: one confirmation when nothing holds files; the move-or-delete choice when something does, stating the count; a second confirmation naming the count when delete is chosen (FR-011a). Exclude the subtree being deleted from its own destination list (spec Edge Cases)
- [ ] T048 [P] [US5] Extend the local-store tests: `none` refused when documents exist, `move` relocates every document and deletes nothing, `delete` with a stale `confirmedCount` is refused, a refusal leaves counts unchanged, deleting a category takes its groups
- [ ] T049 [P] [US5] Create `components/DeleteTaxonomyDialog.test.tsx` in jsdom (following `RoomChecklistBox.test.tsx`): the second confirmation appears only for the delete path, dismissing either dialog calls no action, the count shown matches what is passed in
- [ ] T050 [US5] Run quickstart Scenario 7, all four cases, including confirming the stored file is gone after a destructive delete

---

## Phase 8: Polish & Cross-Cutting

- [ ] T051 [P] Run quickstart Scenario 8: a viewer sees the list unchanged with no management control, and a taxonomy action invoked directly is refused by the server, not merely hidden
- [ ] T052 [P] Run quickstart Scenario 9: unsubmitted typing survives leaving and re-entering management mode
- [ ] T053 [P] Run quickstart Scenario 10 at 375px: every control reachable, a very long group name does not break the row, no horizontal scrolling (Constitution IV)
- [ ] T054 [P] Run quickstart Scenario 11: a failed write is reported and the list returns to the true saved state, never left showing an unsaved change (Constitution V, FR-022)
- [ ] T055 Run `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build` — all clean. Stop the dev server before building; a production build over a running dev server wipes `.next` and breaks it
- [ ] T056 Update `README.md` if the documents section describes groups as coming from document text

---

## Dependencies

```text
Phase 1 (Foundational) ─── blocks everything. T014 is the gate.
   │
   ├─> Phase 2  US1 (P1)  create + picker        ← MVP, shippable alone
   ├─> Phase 3  US2 (P2)  rename
   ├─> Phase 4  US6 (P3)  move ──────────┐
   ├─> Phase 5  US3 (P4)  reorder        │
   ├─> Phase 6  US4 (P5)  add category   │
   └─> Phase 7  US5 (P6)  delete  <──────┘  needs Phase 4: the "move instead"
                                             option needs somewhere to move to
Phase 8 (Polish) ─── after whichever phases ship
```

Phases 2, 3, 5 and 6 are independent of each other and can be done in any order once Phase 1 is done. Phase 7 is the only story with a hard dependency on another story.

## Parallel opportunities

- **Phase 1**: T007, T008 and T010 touch different files and can run together once T002–T006 exist as a written migration. T009 and T011 must follow the type changes.
- **Phase 2 onward**: each phase's schema task ([P]) and its test task ([P]) are independent of the component work in the same phase.
- **Phase 8**: T051–T054 are four separate manual passes and can be split between people.

## Implementation strategy

**MVP is Phase 1 + Phase 2.** That is the whole reported problem solved: sub-topics can exist before files do, and the upload picker is complete and correctly scoped. Everything after it is real but additive.

**Suggested first cut if scope needs trimming**: Phases 1–4 (create, rename, move). Those three cover correctness — a topic that is missing, misnamed, or holding the wrong document. Reordering, adding categories, and deletion are all recoverable-by-hand problems that can wait for a second pass.

**Ship Phase 1 on its own.** It is the only irreversible step and it changes no behaviour, so it is the one piece worth deploying and watching before anything is built on top of it.

## Task count

56 tasks — 14 foundational, 36 across six user stories, 6 polish.
