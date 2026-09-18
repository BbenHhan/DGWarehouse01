---
description: "Task list for Sub-group Requirement Checklist"
---

# Tasks: Sub-group Requirement Checklist

**Input**: Design documents from `specs/046-subgroup-requirement-checklist/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/server-actions.md, quickstart.md

**Tests**: Requested by the account holder ("test ด้วย ทั้ง test และเขียน test"), so every story carries its own tests.

**Organization**: Grouped by user story so each can be built and checked on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 view, US2 edit, US3 initial content

---

## Phase 1: Setup

- [X] T001 Delete the unapplied, uncommitted draft `supabase/migrations/0015_taxonomy_descriptions.sql` (research Decision 10, FR-019)

---

## Phase 2: Foundational (blocks every story)

- [X] T002 Create `supabase/migrations/0015_group_requirements.sql` schema part: `description text` on `document_categories` and `document_groups`; table `document_group_requirements` (id, group_id → document_groups on delete cascade, name_th non-blank check, status check in have/missing/waiting default missing, note, sort_order, created_at, updated_at), index on group_id, and the `authenticated` full-access RLS policy used by the other tables (data-model.md)
- [X] T003 [P] Add `RequirementStatus`, `GroupRequirement`, and optional `description` on `DocumentCategory`/`DocumentGroup` in `lib/types.ts` (keep the draft's description fields, reworded comments)
- [X] T004 [P] Add the `document_group_requirements` table and the two `description` columns to `lib/database.types.ts`
- [X] T005 [P] Create `lib/requirement-status.ts` mapping each status to its Thai label (มีแล้ว / ยังขาด / รอดำเนินการ), short label for the editor (มีแล้ว / ยังขาด / รอ), lucide icon (Check / X / Clock) and tone classes, plus the ordered status list (research Decision 2)
- [X] T006 [P] Add schemas to `lib/validation.ts`: `addRequirementSchema`, `updateRequirementSchema` (at least one field), `deleteRequirementSchema`, `moveRequirementSchema`, `setGroupDescriptionSchema`, `setCategoryDescriptionSchema`, with trimming, blank-name refusal (`กรุณาระบุชื่อรายการ`), whitespace → null for note/description, and the length limits in contracts/server-actions.md
- [X] T007 Extend `lib/local/store.ts`: `LocalDb.groupRequirements` defaulted to `[]` in `loadDb()`; `localGetGroupRequirements(categoryId)`; `localAddRequirement`, `localUpdateRequirement`, `localDeleteRequirement` (renumbers the rest), `localMoveRequirement`; `localSetGroupDescription`, `localSetCategoryDescription`; and remove a group's requirements in `localDeleteDocumentGroup` and every group's in `localDeleteDocumentCategory` (FR-015)
- [X] T008 Add `getGroupRequirements(categoryId)` to `lib/data.ts`: mock → `{}`, local → store, supabase → items for the category's groups sorted by sort_order, grouped by group id; `PGRST205`/`42P01` → `{}`, other errors thrown (research Decision 4)

### Foundational tests

- [X] T009 [P] Create `lib/local/group-requirements.test.ts`: add appends with status missing; update name/status/note persists; whitespace note → null; delete renumbers 1..n; move up/down swaps and renumbers, refuses past the ends; deleting a group removes its items only; deleting a category removes its groups' items; an older db.json without `groupRequirements` loads as empty
- [X] T010 [P] Extend `lib/validation.test.ts` for the new schemas: blank and whitespace names refused with the Thai message, note/description normalized to null, unknown status refused, update with no fields refused

**Checkpoint**: Data exists on both backends and reads safely before the migration is applied.

---

## Phase 3: User Story 1 — See at a glance what each sub-group still lacks (P1) 🎯 MVP

**Goal**: Description and items visible on every sub-group row without expanding, with a status that does not rely on colour, and no counts.

**Independent Test**: Load items for a category, open it as a viewer, confirm each sub-group shows its description and items with icon + Thai label and no tallies.

### Tests for User Story 1

- [X] T011 [P] [US1] Create `components/GroupRequirements.test.tsx` (jsdom): renders description and every item with its Thai status label and note; missing/waiting/have each carry a label, not just a colour; renders nothing when there is neither description nor items; no digits-with-status tallies anywhere; items are not inside the collapse trigger button (research Decision 7)
- [X] T012 [P] [US1] Extend `components/DocList.test.tsx`: a sub-group with requirements shows them without expanding; a sub-group with none looks as before; the file count still shows

### Implementation for User Story 1

- [X] T013 [US1] Create `components/GroupRequirements.tsx`: read-only description + ordered list, each row icon + label chip, name, optional note; wraps at 375px; returns null when empty (FR-004–FR-007)
- [X] T014 [US1] Update `components/DocList.tsx`: accept `requirements: Record<string, GroupRequirement[]>`; move the draft's description out of the `CollapsibleTrigger`; render `GroupRequirements` between the header and `CollapsibleContent` in browse mode
- [X] T015 [US1] Update `app/(app)/documents/[categorySlug]/page.tsx` to load `getGroupRequirements(currentCategory.id)` alongside the other reads and pass it to `DocList`
- [X] T016 [US1] Keep the draft's category description rendering in `app/(app)/documents/[categorySlug]/layout.tsx` (FR-008); ensure the ZIP button from the separate draft is untouched

**Checkpoint**: MVP — viewers see the checklist once data exists.

---

## Phase 4: User Story 2 — Keep the list true as documents arrive (P2)

**Goal**: Editors add, edit, re-status, reorder and delete items and edit descriptions in management mode; viewers are refused server-side.

**Independent Test**: As an editor add → re-status → edit → move → delete an item and edit a description; reload after each. As a viewer, every action is refused and nothing changes.

### Tests for User Story 2

- [X] T017 [P] [US2] Create `app/actions/group-requirements.test.ts` on the local backend with `requireRole` mocked and the Supabase client stubbed to throw (the `document-taxonomy.test.ts` pattern): every action refused for viewer and for signed-out with distinct messages and store unchanged; gate asks for editor, not admin; mock backend refused; blank name refused with store unchanged; add/update/delete/move/description happy paths; unknown id → `ไม่พบรายการนี้` / `ไม่พบหมวดย่อยนี้` / `ไม่พบหมวดนี้`
- [X] T018 [P] [US2] Create `components/GroupRequirementsEditor.test.tsx` (jsdom): status tap updates immediately and reverts with a toast when the action fails; delete removes immediately and restores on failure; add appends and clears the field; blank add disabled; editing a note calls `updateRequirement`; description cleared to spaces sends null; status buttons expose `aria-pressed`
- [X] T019 [P] [US2] Extend `components/CategoryManagePanel.test.tsx`: category description editable in management mode and saved through `setCategoryDescription`

### Implementation for User Story 2

- [X] T020 [US2] Create `app/actions/group-requirements.ts` ("use server"): `addRequirement`, `updateRequirement`, `deleteRequirement`, `moveRequirement`, `setGroupDescription`, `setCategoryDescription` per contracts/server-actions.md — rights first, validation second, mock/local/supabase split, missing-table → `ยังไม่ได้เปิดใช้รายการเอกสารที่ต้องมี (ต้องรัน migration 0015 ก่อน)`, dense renumbering, revalidate document paths
- [X] T021 [US2] Create `components/GroupRequirementsEditor.tsx`: editable description (`EditableName`-style commit on blur/Enter); per item three-button status control with `aria-pressed`, `EditableName` for name, editable note, `ReorderButtons` through the manage-mode queue, delete button; `useOptimistic` for status and delete with rollback + `toast.error`; add form with delayed spinner (Constitution V)
- [X] T022 [US2] Update `components/DocList.tsx` to render `GroupRequirementsEditor` under each sub-group row in management mode
- [X] T023 [US2] Update `components/CategoryManagePanel.tsx` to show an editable description line under each category row, saved through `setCategoryDescription`

**Checkpoint**: Editors maintain the list; viewers read it.

---

## Phase 5: User Story 3 — Start from the audited หมวด 6 list (P3)

**Goal**: The migration loads the appendix content once, safely and without duplicates.

**Independent Test**: The seed test proves SQL ≡ appendix; after applying, the live page matches the appendix and a re-run changes nothing.

### Tests for User Story 3

- [X] T024 [P] [US3] Create `lib/requirement-seed.test.ts`: parse the appendix in `specs/046-subgroup-requirement-checklist/spec.md` and the seed rows in `supabase/migrations/0015_group_requirements.sql`; assert identical sub-groups, descriptions, category description, items, order, statuses (Thai → code) and notes; assert the SQL only inserts where a group has no items and only sets null descriptions (FR-018)

### Implementation for User Story 3

- [X] T025 [US3] Add the seed to `supabase/migrations/0015_group_requirements.sql`: category description where null; per-sub-group descriptions where null, matched by `checklist-permit` + name; items from a `values` list inserted with sort_order in appendix order only for groups with zero requirement rows

**Checkpoint**: All three stories complete.

---

## Phase 6: Polish & Cross-Cutting

- [X] T026 Confirm each new check fails when the behaviour it protects is reverted (rights gate, optimistic rollback, cascade, seed idempotency guard), then restore
- [X] T027 Run `npx vitest run` (twice, no flakes), `npx tsc --noEmit`, `npm run lint`, and `npm run build` with the dev server stopped; clear `.next` and restart dev afterwards
- [X] T028 Verify in the browser against the local backend at 375px: rows wrap, no horizontal scroll, statuses readable, editor controls reachable (quickstart Scenarios 1, 3)
- [X] T029 Verify Scenario 0 against the live project before the migration: the documents page still loads with no items and no error
- [X] T030 **[a person is needed: SQL Editor access]** Apply `0015_group_requirements.sql` to the live project, then confirm quickstart Scenario 2 (content matches, re-run changes nothing)

---

## Dependencies

```text
T001 → T002 → (T003, T004, T005, T006 in parallel) → T007 → T008 → (T009, T010)
      → US1: T011, T012 → T013 → T014 → T015 → T016
      → US2: T017, T018, T019 → T020 → T021 → T022 → T023
      → US3: T024 → T025
      → T026 → T027 → T028 → T029 → T030
```

US2 depends on US1's row layout (T014). US3 depends only on the schema (T002) and can run beside US1/US2.

## Parallel opportunities

- T003–T006 touch different files.
- T009 and T010 once T007/T006 exist.
- Test tasks T011/T012, T017/T018/T019 are separate files.
- T024/T025 can proceed alongside US1 and US2.

## Implementation strategy

1. Foundation (T001–T010) with its tests green.
2. US1 → MVP: readable checklist for everyone.
3. US2 → editors keep it current.
4. US3 → load the audited หมวด 6 content.
5. Polish, full verification, then hand T030 to the account holder.
