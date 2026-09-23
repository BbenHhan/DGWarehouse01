---
description: "Task list for Download a Category as One ZIP"
---

# Tasks: Download a Category as One ZIP

**Input**: Design documents from `specs/047-category-zip-download/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/download-route.md, quickstart.md

**Tests**: Requested by the account holder ("test ด้วย ทั้ง test และเขียน test"). The draft arrived with tests for the archive writer and the folder layout; the gaps are the route and the two defects below.

**Organization**: By user story. US1 (the bundle) is already working in the draft, so its tasks are verification; US2 and US3 carry the fixes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files)
- **[Story]**: US1 bundle, US2 nothing lost, US3 boundary

---

## Phase 1: Setup

- [X] T001 Move the central-directory archive reader out of `lib/zip.test.ts` into `lib/zip-test-helpers.ts` (exporting `parseZip` and its `ParsedEntry` type) and import it back, so the route test reads archives the same way (research Decision 5)

---

## Phase 2: Foundational

No shared prerequisites beyond T001 — the draft's writer, folder layout and button already exist.

---

## Phase 3: User Story 1 — Take a whole category away as one organised bundle (P1) 🎯 MVP

**Goal**: Confirm the draft's layout and Thai names are right, and keep them right.

**Independent Test**: Extract a downloaded archive and compare folders, order and contents with the category page.

- [X] T002 [US1] Confirm `lib/zip.test.ts` and `lib/document-archive.test.ts` already cover FR-002 to FR-006 (UTF-8 flag, numbered folders in editor order, empty folder kept, ungrouped folder, "/" in a name not becoming a folder level); note any gap as a new test rather than assuming coverage

---

## Phase 4: User Story 2 — Never lose a file on the way out (P1)

**Goal**: Two documents can never end up sharing one path.

**Independent Test**: A sub-group holding "ก.pdf", "ก.pdf" and "ก (2).pdf" produces three distinct files.

### Tests for User Story 2

- [X] T003 [US2] Extend `lib/document-archive.test.ts`: a sub-group with "ก.pdf", "ก.pdf" and "ก (2).pdf" yields three distinct paths, all three contents present; and the same when the already-suffixed file comes first (FR-007)

### Implementation for User Story 2

- [X] T004 [US2] Fix `categoryArchiveEntries` in `lib/document-archive.ts` to probe " (n)" upwards until the name is free instead of deriving the suffix from how many names are taken (research Decision 1)

---

## Phase 5: User Story 3 — Safe to offer to everyone (P2)

**Goal**: The route's boundary is proven, and an over-size archive fails instead of corrupting.

**Independent Test**: Request the archive signed out, for an unknown category, and inspect a successful download's headers.

### Tests for User Story 3

- [X] T005 [P] [US3] Create `app/api/documents/[categorySlug]/zip/route.test.ts` against the local backend: 401 with the Thai message and no body when `requireUser` throws; 404 with the Thai message for an unknown slug; 200 carrying `application/zip`, `no-store`, both filename forms; and a body that parses through `parseZip` into the expected folders and file contents (contracts/download-route.md)
- [X] T006 [P] [US3] Extend `lib/zip.test.ts`: an archive that would pass 0xFFFFFFFF bytes, and one that would pass 65,535 entries, each end the stream with an error rather than producing a readable-looking archive (FR-010)

### Implementation for User Story 3

- [X] T007 [US3] Add the size and count guard to `zipStream` in `lib/zip.ts`: before writing an entry, error the stream if the running offset plus this entry would exceed 0xFFFFFFFF or the entry count would exceed 65,535, with a Thai message naming the limit
- [X] T008 [US3] In `app/api/documents/[categorySlug]/zip/route.ts`, build the `filename=` fallback from an ASCII-only form of the slug, defaulting to `documents.zip` when nothing survives, so a non-Latin slug cannot throw while constructing the response (FR-012, research Decision 4)

---

## Phase 6: Polish & Cross-Cutting

- [X] T009 Confirm each new check fails when the behaviour it protects is reverted (collision fix, size guard, ASCII fallback), then restore
- [X] T010 Run `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, and `npm run build` with the dev server stopped; clear `.next` and restart dev afterwards
- [X] T011 Download a real category from the running app, extract it, and confirm folders, Thai names and contents (quickstart Scenario 1). Now also automated: `e2e/documents-files.spec.ts` presses the button in a real browser and extracts what comes back with `ditto`, the tool Finder uses (specs/049)
- [ ] T012 **[a person is needed: a second operating system]** Extract the same archive on Windows and confirm Thai names read correctly (SC-003); macOS is covered by T011

---

## Dependencies

```text
T001 → T005
T003 → T004
T006 → T007
T002, T008 independent
T004, T007, T008 → T009 → T010 → T011 → T012
```

## Parallel opportunities

- T005 and T006 are different files and can be written together once T001 lands.
- T002 is a read-only audit and can run at any point.

## Implementation strategy

1. T001 so both test files share one archive reader.
2. US2's fix first — it is the one that silently loses a document.
3. US3's guard and header, with the route's first tests.
4. Verify by reverting each protected behaviour, then the full gate.
