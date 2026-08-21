---

description: "Task list for Upload Tray Persistence"

---

# Tasks: Upload Tray Persistence

**Input**: Design documents from `/specs/022-upload-tray-persistence/`

**Status**: Retroactively documented — already implemented and verified.

## Phase 1: Foundational

- [X] T001 Create `lib/upload-tray-db.ts`: `openDb()` (one object store, keyPath `id`), `saveTrayFile`, `deleteTrayFile`, `loadAllTrayFiles`

## Phase 2: User Story 1 - Files survive refresh/restart (Priority: P1)

- [X] T002 [US1] In `BulkUploadWorkspace.tsx`, call `saveTrayFile` inside `addFiles` for every newly added item
- [X] T003 [US1] Call `deleteTrayFile` inside `removeFiles` (covers both the successful-upload cleanup path and the explicit-discard path, since both already funnel through this one function)
- [X] T004 [US1] Call `saveTrayFile` inside `duplicateFile` for the new copy
- [X] T005 [US1] Call `saveTrayFile` inside `assignFileKeepInTray`'s success branch with the updated `confirmedFor` array
- [X] T006 [US1] Add a mount-time `useEffect` calling `loadAllTrayFiles()`, mapping results to `UnsortedFile` (`status: "waiting"` always, `previewUrl` regenerated), merging into state, with a `toast.success` showing the restored count; wrapped in `.catch()` for graceful degradation

## Phase 3: User Story 2 - Date remembered (Priority: P3)

- [X] T007 [US2] Add `UPLOAD_DATE_STORAGE_KEY` localStorage read on mount (fallback to today) and write on every date change (`handleDateChange` wrapper replacing the raw `setDate` call passed to `UploadDatePicker`)

## Phase 4: Polish

- [X] T008 [P] `npx tsc --noEmit` — clean
- [X] T009 [P] `npx next lint` — clean (one `eslint-disable` comment added then removed after confirming it was unnecessary)
- [X] T010 [P] `npm test` — 36/36 passing, unaffected
- [X] T011 Dev-server compile check of `/upload` — no server errors (full authenticated add-files-then-refresh click-through remains account-holder-only)

## Summary

11/11 tasks complete.
