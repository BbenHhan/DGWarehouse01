---
description: "Task list for Cover the Remaining Server Actions"
---

# Tasks: Cover the Remaining Server Actions

**Input**: Design documents from `specs/048-server-action-coverage/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/test-contract.md, quickstart.md

**Tests**: This feature *is* tests. Every task below writes checks; none changes how the app behaves (FR-017).

**Organization**: By user story, US1 first — it is the only one whose failure is a security hole.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: different files, can be written in parallel
- **[Story]**: US1 rights · US2 stored files · US3 uploads · US4 checklist rules · US5 account safeguards

---

## Phase 1: Setup

- [X] T001 Create `lib/supabase-stub.ts`: a chainable query double where `from(table)` yields a per-table configured result, `storage.from(bucket).remove(paths)` records its call, and every call is recorded in order so a test can assert what happened and when (data-model.md, research Decision 5)
- [X] T002 Rewrite the inline double in `lib/group-requirements-before-migration.test.ts` to import `lib/supabase-stub.ts`, so one shape is shared rather than copied

---

## Phase 2: Foundational

- [X] T003 Read `app/actions/photos.ts`, `documents.ts`, `checklist.ts`, `users.ts`, `auth.ts` end to end and write down, per action, the exact Thai refusal strings, the required role, and which backend branches exist — the checks must assert what the code actually returns, not what it ought to

---

## Phase 3: User Story 1 — A viewer cannot change anything, anywhere (P1) 🎯 MVP

**Goal**: Every action in all five modules refuses a viewer and a signed-out caller, with different messages, changing nothing.

**Independent Test**: Call every action as a viewer and as signed-out; check each refusal and that stored data is untouched.

- [X] T004 [P] [US1] In `app/actions/photos.test.ts`, cover every export: refused for viewer (`คุณไม่มีสิทธิ์ทำรายการนี้`) and for signed-out (`กรุณาเข้าสู่ระบบก่อนทำรายการนี้`), with the photo list, the stored files and the records unchanged after each refusal (FR-001, FR-003)
- [X] T005 [P] [US1] The same for every export in `app/actions/documents.test.ts` (FR-001, FR-003)
- [X] T006 [P] [US1] The same for every export in `app/actions/checklist.test.ts` (FR-001, FR-003)
- [X] T007 [P] [US1] In `app/actions/users.test.ts`, every export refused for a viewer **and for an editor** — accounts require an admin (FR-002)
- [X] T008 [P] [US1] In each of the four files, one check that a refused caller passing invalid input is refused for rights rather than for the input (FR-004)

**Checkpoint**: the security boundary is covered for every Server Action in the app (SC-001).

---

## Phase 4: User Story 2 — Nothing is destroyed or corrupted by a permitted action (P1)

**Goal**: A delete takes the stored file with it; a move never rewrites where a file lives.

**Independent Test**: Delete a photo and a document, then look on disk; move documents and compare every `storage_path` before and after.

- [X] T009 [US2] In `app/actions/photos.test.ts`: `deletePhoto` removes the record **and** the file from the temp directory; an unknown id returns `ไม่พบรูปภาพนี้` and touches nothing (FR-005, FR-007)
- [X] T010 [US2] In `app/actions/documents.test.ts`: the same for `deleteDoc` with `ไม่พบเอกสารนี้` (FR-005, FR-007)
- [X] T011 [US2] In `app/actions/photos.test.ts` and `documents.test.ts`, with `DATA_SOURCE` set to supabase and the stand-in client: the stored object is removed, and the row is **not** deleted when removing the object fails (research Decision 3)
- [X] T012 [US2] In `app/actions/documents.test.ts`: `moveDocuments` relocates every document, reports the count, leaves every `storage_path` byte-for-byte unchanged, and treats an empty list as a no-op (FR-006)
- [X] T013 [US2] In `app/actions/photos.test.ts` and `documents.test.ts`: `editPhoto` / `editDoc` change only the fields passed, and an edit with nothing to change is refused

**Checkpoint**: every path that removes a stored file is covered (SC-002).

---

## Phase 5: User Story 3 — A bad file is refused, and one bad file does not sink the rest (P2)

**Goal**: Size and type are checked before anything is stored, per file.

**Independent Test**: Upload a batch of one oversized, one disallowed and two good files.

- [X] T014 [P] [US3] In `app/actions/photos.test.ts`: a file over `MAX_FILE_SIZE_BYTES` and a file of a disallowed type are each refused with a reason naming the file, and nothing is written to the temp directory for them (FR-008)
- [X] T015 [P] [US3] The same in `app/actions/documents.test.ts`, plus: a typed sub-group name resolves to that sub-group on upload
- [X] T016 [US3] In both files: a mixed batch stores every good file and reports every bad one in a single result (FR-009)

---

## Phase 6: User Story 4 — The checklist's room and sub-item rules hold through the action (P2)

**Goal**: Room ticks are independent; parents follow their sub-items; deleting a parent takes its sub-items.

**Independent Test**: Tag one item to two rooms and tick it in one.

- [X] T017 [US4] In `app/actions/checklist.test.ts`: `setChecklistItemRoomStatus` on one room leaves the other room's status and the item's own status unchanged (FR-010)
- [X] T018 [US4] `setChecklistItemStatus`: a parent reads as finished only when every sub-item is, and reopening one sub-item reopens the parent (FR-011)
- [X] T019 [US4] `deleteChecklistItem` on a parent removes its sub-items and no other item (FR-012)
- [X] T020 [US4] `addChecklistItem` tags exactly the rooms given and refuses blank text; `editChecklistItem` changes text, detail and dates, and is refused when nothing is passed

---

## Phase 7: User Story 5 — The two account safeguards cannot be talked around (P2)

**Goal**: The last admin cannot be demoted; a handled request cannot be handled again.

**Independent Test**: Try to demote the only admin; approve an already-approved request.

- [X] T021 [US5] In `app/actions/users.test.ts`: demoting the only admin is refused with `ต้องมีผู้ดูแลระบบอย่างน้อย 1 คนเสมอ ไม่สามารถเปลี่ยนสิทธิ์นี้ได้` and the role is unchanged; demoting one of two succeeds (FR-013)
- [X] T022 [US5] `approveRoleRequest` and `denyRoleRequest` refuse a request already approved or denied (FR-014)
- [X] T023 [US5] `requestEditorAccess` refuses a second request while one is pending, creating nothing (FR-015)
- [X] T024 [P] [US5] Create `app/actions/auth.test.ts`: `signOut` ends the session and sends the person to the login page

---

## Phase 8: Polish & Cross-Cutting

- [X] T025 Confirm each new check fails when the behaviour it protects is reverted — the rights gate, the file-with-row delete, `moveDocuments` leaving `storage_path` alone, the last-admin rule, and the handled-request rule — restoring each afterwards (FR-018, SC-005)
- [X] T026 Run `npx vitest run` twice for intermittent failures, then `npx tsc --noEmit` and `npm run lint` (SC-004)
- [X] T027 Re-run the coverage audit: every Server Action module has a test file, and report anything still uncovered (SC-001)
- [X] T028 Report every defect found along the way, with what the code does now and what the check expected — no production file changes without the account holder's agreement (FR-017, SC-006)

---

## Dependencies

```text
T001 → T002, and T001 → T007, T011, T021-T024 (everything using the stand-in)
T003 → all test-writing tasks
US1 (T004-T008) → US2 (T009-T013) → US3 (T014-T016)
US4 (T017-T020) and US5 (T021-T024) are independent of US2/US3
all → T025 → T026 → T027 → T028
```

## Parallel opportunities

- T004–T007 are four separate files.
- T014/T015, and T024 alongside T021–T023.

## Implementation strategy

1. The stand-in client and the read-through of the five modules.
2. US1 across all five files — the security boundary, and the MVP.
3. US2, the file-safety rules, then US3's upload guards.
4. US4 and US5, which are independent of each other.
5. Revert-check every new behaviour, run the full gate, then report findings.
