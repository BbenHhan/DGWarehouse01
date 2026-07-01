---
description: "Task list for Progress Tracker Web Migration"
---

# Tasks: Progress Tracker Web Migration

**Input**: Design documents from `/specs/001-progress-tracker-migration/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Not requested for this feature (see plan.md Technical Context) — omitted. Validation happens manually via `quickstart.md`.

**Custom ordering**: Per explicit user direction, phases run
Supabase setup → auth → data layer → UI (view stories) → upload → delete → edit → deploy,
instead of strict spec priority order. Each task still carries its `[US#]` label
so story-level traceability and independent testability are preserved.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to a user story from spec.md (US1–US6); Setup/Foundational/Polish tasks have no story label
- Every task names its exact file path and ends with a "Done when" line

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Scaffold the Next.js project and its core tooling.

- [X] T001 Initialize a Next.js 15 (App Router, TypeScript) project at the repo root, producing `package.json`, `tsconfig.json`, `next.config.ts`, `app/` — run `npx create-next-app@latest . --typescript --app --no-src-dir`.
  **Done when**: `npm run dev` starts and serves the default page at `http://localhost:3000`. ✅ Verified via preview server + screenshot; pinned to next@15.5.19 (create-next-app defaulted to 16).
- [X] T002 [P] Install and configure Tailwind CSS v4 in `app/globals.css` and `postcss.config.mjs`.
  **Done when**: a Tailwind utility class (e.g. `bg-blue-500`) visibly renders on the default page. ✅ Verified via preview_inspect (computed `oklch` background from Tailwind class).
- [X] T003 [P] Initialize shadcn/ui (`components.json`, `components/ui/`) via `npx shadcn@latest init`, adding the `button`, `dialog`, `tabs`, `input`, `textarea`, and `toast` components.
  **Done when**: `components/ui/button.tsx` exists and renders in a test import without errors. ✅ Used `sonner` instead of the deprecated `toast` primitive (current shadcn/ui recommendation) for the same loading/error toast role.
- [X] T004 [P] Add Supabase and validation dependencies to `package.json`: `@supabase/supabase-js`, `@supabase/ssr`, `zod`.
  **Done when**: `npm install` completes and all three packages appear in `package.json` dependencies. ✅
- [X] T005 [P] Create `.env.local.example` documenting `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
  **Done when**: the file lists all three variable names with placeholder values and a one-line comment on where to find each in the Supabase dashboard. ✅

**Checkpoint**: Project boots locally with Tailwind + shadcn/ui wired in.

---

## Phase 2: Supabase Project Setup

**Purpose**: Stand up the database schema, RLS policies, and storage buckets everything else depends on (see [contracts/supabase-setup.md](./contracts/supabase-setup.md)).

**⚠️ CRITICAL**: No auth, data-layer, or UI work can be meaningfully tested until this phase is complete.

- [X] T006 Create `supabase/migrations/0001_schema.sql` defining tables `rooms`, `work_types`, `weeks`, `document_categories`, `photos`, `documents` per [data-model.md](./data-model.md).
  **Done when**: running the migration against a Supabase project creates all six tables with the documented columns and foreign keys, with no errors. ⏸ Written and manually reviewed (FKs, checks, `updated_at` triggers); local Docker Desktop daemon was not running so live execution against Postgres/Supabase is deferred until credentials are provided.
- [X] T007 Create `supabase/migrations/0002_rls.sql` enabling RLS and adding the `authenticated`-only policies from [contracts/supabase-setup.md](./contracts/supabase-setup.md) for `weeks`, `photos`, `documents`, and read-only policies for `rooms`, `work_types`, `document_categories`.
  **Done when**: querying any table as the `anon` role returns zero rows / a permission error, and querying as an authenticated user succeeds. ⏸ Written per contract; requires a live Supabase project (real `auth` schema) to execute — deferred.
- [X] T008 Create `supabase/migrations/0003_storage.sql` creating the `photos` and `documents` Storage buckets with public-read and authenticated-write/delete policies per [contracts/supabase-setup.md](./contracts/supabase-setup.md).
  **Done when**: an authenticated upload to each bucket succeeds, an anonymous upload is rejected, and a public GET on an uploaded object's public URL succeeds. ⏸ Written per contract; requires a live Supabase project (real `storage` schema) to execute — deferred.
- [X] T009 Create `supabase/migrations/0004_seed_lookups.sql` inserting the 6 fixed rooms (ห้องแรก, ห้องกลาง, ห้องซอย 1–4), 6 fixed work types (Firewalls, Electrical, Roofing, Flooring, Drainage, Overview), and 4 fixed document categories (หมวดที่ 1–4).
  **Done when**: `select * from rooms` returns 6 rows, `select * from work_types` returns 6 rows, `select * from document_categories` returns 4 rows, all with correct Thai names and emoji. ⏸ Data written and reviewed against v7 names/emoji; row-count verification deferred to a live project (attempted a local Docker Postgres check, but Docker Desktop's daemon isn't running on this machine).

**Checkpoint**: Supabase project fully provisioned — schema, security, storage, and fixed lookup data all in place.

---

## Phase 3: Auth

**Purpose**: Wire up Supabase Auth (magic link + Google OAuth) end-to-end so every later route can be gated behind a session.

**⚠️ CRITICAL**: No page can be verified as access-controlled until this phase is complete.

- [ ] T010 Create the server-side Supabase client factory in `lib/supabase/server.ts` using the service role key, for use only in Server Actions and Server Components.
  **Done when**: a Server Component can call this factory and successfully run a `select` against a seeded table.
- [ ] T011 [P] Create the browser Supabase client factory in `lib/supabase/client.ts` using the anon key, for use only in Client Components.
  **Done when**: a Client Component can call this factory and successfully subscribe to a Realtime channel without a console error.
- [ ] T012 Create the session-refresh helper in `lib/supabase/middleware.ts`.
  **Done when**: calling the helper from a test route refreshes an expiring session cookie without throwing.
- [ ] T013 Create `middleware.ts` at the repo root invoking the helper from `lib/supabase/middleware.ts` on every request.
  **Done when**: visiting any route while signed in keeps the session alive across a page reload after the original token's short expiry window.
- [ ] T014 [P] Create `app/login/page.tsx` with a Thai-language magic-link sign-in form and a "Sign in with Google" button.
  **Done when**: submitting an email sends a magic link (visible in Supabase Auth logs) and clicking "Sign in with Google" redirects to Google's OAuth consent screen.
- [ ] T015 [P] Create `app/auth/callback/route.ts` exchanging the auth code for a session and redirecting to `/photos`.
  **Done when**: following a magic-link email or completing Google OAuth lands the browser on `/photos` with an active session cookie.
- [ ] T016 Create `app/layout.tsx` as the root layout: sets `<html lang="th">`, loads global styles, and redirects unauthenticated requests to `/login` for any route other than `/login` and `/auth/callback`.
  **Done when**: visiting `/photos` while signed out redirects to `/login`; visiting it while signed in renders normally.

**Checkpoint**: A user can sign in via magic link or Google, land on `/photos`, and get redirected to `/login` when signed out.

---

## Phase 4: Data Layer

**Purpose**: Shared types, validation, and data-fetching helpers used by every UI component and Server Action.

- [ ] T017 [P] Define shared TypeScript types (`Room`, `WorkType`, `Week`, `Photo`, `DocumentCategory`, `Document`, `ActionResult<T>`) in `lib/types.ts`, matching [data-model.md](./data-model.md) and [contracts/server-actions.md](./contracts/server-actions.md).
  **Done when**: every other file in the project that references these shapes imports them from `lib/types.ts` with no duplicate local definitions.
- [ ] T018 [P] Define Zod schemas for all six Server Action inputs (`uploadPhoto`, `deletePhoto`, `editPhoto`, `uploadDoc`, `deleteDoc`, `editDoc`) in `lib/validation.ts`, enforcing the 25 MB/20-file limits and allowed MIME types from [research.md](./research.md).
  **Done when**: parsing a known-valid input succeeds and parsing an oversized/invalid-type file fails with a human-readable message.
- [ ] T019 [P] Create data-fetching helpers in `lib/data.ts`: `getRooms()`, `getWorkTypes()`, `getWeeks(roomId, workTypeId)`, `getPhotos(weekId)`, `getDocumentCategories()`, `getDocuments(categoryId)`.
  **Done when**: each helper, called against the seeded Supabase project, returns the expected rows with correct typing (no `any`).

**Checkpoint**: Types, validation, and data access are ready for both UI and Server Actions to build on.

---

## Phase 5: User Story 1 - View Progress Photos by Room, Work Type, and Week (Priority: P1) 🎯 MVP

**Goal**: Bell can navigate room → work type → week and view/browse photos full-screen.

**Independent Test**: Seed one room/work-type/week with several photos; confirm navigation shows exactly those photos and the lightbox steps through them.

- [ ] T020 [P] [US1] Create `app/page.tsx` redirecting `/` to `/photos`.
  **Done when**: visiting `/` while signed in lands on `/photos`.
- [ ] T021 [P] [US1] Create `app/photos/page.tsx` listing the 6 rooms and redirecting to the first room's first work type.
  **Done when**: visiting `/photos` shows all 6 rooms (or redirects into the first one) with correct Thai names and emoji.
- [ ] T022 [P] [US1] Create `components/RoomWorkTypeNav.tsx` rendering room tabs, work-type tabs, and week tabs, using `lib/data.ts` helpers.
  **Done when**: switching room/work-type/week tabs updates the active selection and is usable via keyboard and touch.
- [ ] T023 [P] [US1] Create `components/PhotoGrid.tsx` rendering a responsive grid of photo thumbnails (using Next.js `<Image>`) for a given week, with an empty state when there are no photos.
  **Done when**: a week with photos renders a thumbnail grid; a week with none shows the empty state with an upload prompt.
- [ ] T024 [P] [US1] Create `components/Lightbox.tsx`: a full-screen photo viewer with next/previous navigation within the current week's photo list.
  **Done when**: opening any thumbnail launches the lightbox on that photo, and next/previous correctly cycles through the same week's photos.
- [ ] T025 [US1] Create `app/photos/[roomSlug]/[workTypeSlug]/page.tsx` composing `RoomWorkTypeNav`, `PhotoGrid`, and `Lightbox` for the selected room/work-type/week.
  **Done when**: navigating to a specific room+work-type URL shows that combination's week tabs and photos, and tapping a photo opens the lightbox (spec US1 acceptance scenarios 1–3).

**Checkpoint**: Photo viewing (the MVP) works end-to-end and is independently demoable.

---

## Phase 6: User Story 2 - View Documents by Category (Priority: P1)

**Goal**: Bell browses the 4 หมวด categories and opens a document.

**Independent Test**: Seed one document per category; confirm each category lists only its own documents and opening one previews/downloads correctly.

- [ ] T026 [P] [US2] Create `components/DocList.tsx` rendering a list of documents (name, type icon) for a given category, with an empty state.
  **Done when**: a category with documents lists them; a category with none shows the empty state.
- [ ] T027 [US2] Create `app/documents/[categorySlug]/page.tsx` rendering category tabs plus `DocList` for the selected หมวด, with documents opening in a new tab (preview or download per file type).
  **Done when**: visiting each of the 4 category URLs shows only that category's documents, and opening a PDF previews inline while a DOCX/XLSX downloads (spec US2 acceptance scenarios 1–2).

**Checkpoint**: Both core viewing stories (US1, US2) are complete and independently demoable.

---

## Phase 7: User Story 3 - Upload Photos, Single or Batch (Priority: P2)

**Goal**: Bell uploads one or several photos at once to a specific room/work-type/week.

**Independent Test**: From an empty week, upload 5 photos in one action; confirm all 5 appear once the upload completes, with a loading state shown during upload.

- [ ] T028 [US3] Implement the `uploadPhoto` Server Action in `app/actions/photos.ts`, validating input with `lib/validation.ts`, uploading each file to the `photos` Storage bucket, and inserting a `photos` row per success, returning the per-file `ActionResult` shape from [contracts/server-actions.md](./contracts/server-actions.md).
  **Done when**: calling the action with a mixed batch (valid + oversized/invalid file) returns `results` correctly marking each file's success/failure, and valid files are visible in Supabase Storage and the `photos` table.
- [ ] T029 [US3] Create `components/PhotoUploader.tsx`: file picker (single/multi-select), upload-progress state, and per-file success/error reporting, calling `uploadPhoto`.
  **Done when**: selecting 5 photos and uploading shows a loading indicator during upload and, on completion, all 5 appear without a manual page refresh (spec SC-002).
- [ ] T030 [US3] Wire `PhotoUploader` into `app/photos/[roomSlug]/[workTypeSlug]/page.tsx`, including an "add new week" control that creates a week via `lib/data.ts`/a small Server Action before uploading into it.
  **Done when**: Bell can create a new week and immediately upload photos into it from the same page.

**Checkpoint**: Photo upload (US3) works end-to-end, including partial-batch-failure handling.

---

## Phase 8: User Story 4 - Upload Documents to a Category (Priority: P2)

**Goal**: Bell uploads a document to one of the 4 หมวด categories.

**Independent Test**: Upload a PDF to หมวดที่ 1; confirm it appears in that category's list with a success confirmation.

- [ ] T031 [US4] Implement the `uploadDoc` Server Action in `app/actions/documents.ts`, mirroring `uploadPhoto`'s validation/upload/insert pattern for the `documents` bucket and table.
  **Done when**: uploading a valid PDF/DOCX/XLSX succeeds and an unsupported format is rejected with a clear per-file error.
- [ ] T032 [US4] Create `components/DocUploader.tsx`: file picker, upload-progress state, and success/error reporting, calling `uploadDoc`.
  **Done when**: uploading a document shows a loading indicator, then a success confirmation once the document appears in the list.
- [ ] T033 [US4] Wire `DocUploader` into `app/documents/[categorySlug]/page.tsx`.
  **Done when**: Bell can upload a document from the category page and see it appear in `DocList` without a manual refresh (spec US4 acceptance scenario 1).

**Checkpoint**: Both upload stories (US3, US4) are complete.

---

## Phase 9: User Story 6 - Delete Photos and Documents (Priority: P3)

**Goal**: Bell deletes a photo or document with confirmation and immediate (optimistic) removal from view.

**Independent Test**: Delete an existing photo and confirm; confirm it disappears immediately and does not reappear after reload.

- [ ] T034 [P] [US6] Implement the `deletePhoto` Server Action in `app/actions/photos.ts`, removing both the Storage object and the `photos` row.
  **Done when**: calling the action removes the row from `photos` and the object from the `photos` bucket, and returns `{ ok: true, data: { photoId } }`.
- [ ] T035 [P] [US6] Implement the `deleteDoc` Server Action in `app/actions/documents.ts`, mirroring `deletePhoto` for documents.
  **Done when**: calling the action removes the row from `documents` and the object from the `documents` bucket.
- [ ] T036 [P] [US6] Add a delete button + confirmation dialog to `components/PhotoGrid.tsx` using optimistic local-state removal (rollback + error toast on failure).
  **Done when**: confirming delete removes the photo from the grid within ~1 second, before the Server Action necessarily resolves (spec SC-003); cancelling leaves it untouched.
- [ ] T037 [P] [US6] Add the same delete button + confirmation + optimistic-removal pattern to `components/DocList.tsx`.
  **Done when**: confirming delete removes the document from the list immediately; cancelling leaves it untouched; a reload never shows a confirmed-deleted item again.

**Checkpoint**: Delete is complete for both photos and documents, with optimistic UX per the constitution.

---

## Phase 10: User Story 5 - Edit Photo/Document Details (Priority: P3)

**Goal**: Bell renames a file, edits its note, or moves it to a different week/category.

**Independent Test**: Rename an existing photo, add a note, then move it to a different week; confirm the new name/note persist and it now appears only under the new week.

- [ ] T038 [P] [US5] Implement the `editPhoto` Server Action in `app/actions/photos.ts` supporting partial updates to `fileName`, `note`, and `weekId`, rejecting an empty `fileName`.
  **Done when**: renaming, adding a note, and moving a photo to a different week each succeed independently and in combination, and an empty-string rename is rejected with a clear error.
- [ ] T039 [P] [US5] Implement the `editDoc` Server Action in `app/actions/documents.ts`, mirroring `editPhoto` for `categoryId` instead of `weekId`.
  **Done when**: renaming, adding a note, and moving a document to a different หมวด each succeed, and an empty-string rename is rejected.
- [ ] T040 [US5] Create `components/EditModal.tsx`: a shared dialog with fields for file name, note, and a week/category picker (mode depends on whether it's opened for a photo or document), calling `editPhoto`/`editDoc`.
  **Done when**: opening the modal pre-fills current values, and saving updates only the changed fields.
- [ ] T041 [P] [US5] Wire `EditModal` into `components/PhotoGrid.tsx` (edit action per photo tile).
  **Done when**: editing a photo's name/note/week from the grid reflects the change immediately in `PhotoGrid` and `Lightbox` (spec US5 acceptance scenarios 1–3).
- [ ] T042 [P] [US5] Wire `EditModal` into `components/DocList.tsx` (edit action per document row).
  **Done when**: editing a document's name/note/category reflects the change immediately in `DocList` (spec US5 acceptance scenario 4).

**Checkpoint**: All six user stories are complete and independently functional.

---

## Phase 11: Deploy & Polish

**Purpose**: Ship to production and cover optional/cross-cutting concerns.

- [ ] T043 [P] Create the optional v7 import script in `supabase/seed/seed-from-v7.ts`, walking the local v7 folder structure and uploading files + inserting metadata rows.
  **Done when**: running the script locally against a copy of the v7 folder structure populates photos/documents correctly grouped by room/work-type/week or หมวด (spec Scenario 9 in quickstart.md).
- [ ] T044 Configure the Vercel project: link the repo, set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` as environment variables, and set the Supabase Auth redirect URL to the production domain's `/auth/callback`. Document the steps in `DEPLOYMENT.md`.
  **Done when**: a production build succeeds on Vercel with no missing-env errors.
- [ ] T045 Deploy to Vercel and run all [quickstart.md](./quickstart.md) scenarios against the production URL.
  **Done when**: every quickstart scenario (sign-in, view, upload, edit, delete, mobile responsiveness) passes on the deployed production app.
- [ ] T046 [P] Write `README.md` with local setup, environment variable, and deployment instructions.
  **Done when**: a developer with no prior context can follow `README.md` to run the app locally end-to-end.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Supabase Setup (Phase 2)**: Depends on Setup — BLOCKS Auth, Data Layer, and all user stories.
- **Auth (Phase 3)**: Depends on Supabase Setup — BLOCKS all user stories (every route needs a session).
- **Data Layer (Phase 4)**: Depends on Supabase Setup; independent of Auth internals but typically done after Phase 3 since it queries through the authenticated server client — BLOCKS all user stories.
- **User Stories (Phase 5–10)**: All depend on Phases 1–4. Per the requested delivery order they proceed
  US1 → US2 → US3 → US4 → US6 → US5, though each remains independently testable and could be reordered or parallelized across developers.
- **Deploy & Polish (Phase 11)**: Depends on all desired user stories being complete.

### Within Each User Story

- Data-fetching/Server Action tasks before the components that call them.
- Components before the page that composes them.
- A story is complete and independently testable at its Checkpoint.

### Parallel Opportunities

- Phase 1: T002, T003, T004, T005 in parallel after T001.
- Phase 3: T011 in parallel with T010; T014 and T015 in parallel once T010/T011 exist.
- Phase 4: T017, T018, T019 fully in parallel.
- Phase 5: T020–T024 in parallel with each other (different files); T025 waits on T022–T024.
- Phase 9: T034 and T035 in parallel (different files); T036 and T037 in parallel once their respective actions exist.
- Phase 10: T038 and T039 in parallel (different files); T041 and T042 in parallel once T040 exists.
- Phase 11: T043 and T046 in parallel with the rest.

---

## Parallel Example: Phase 5 (User Story 1)

```bash
# After Phase 4 completes, launch together:
Task: "Create app/page.tsx redirecting / to /photos"
Task: "Create app/photos/page.tsx listing the 6 rooms"
Task: "Create components/RoomWorkTypeNav.tsx"
Task: "Create components/PhotoGrid.tsx"
Task: "Create components/Lightbox.tsx"
# Then, once the above land:
Task: "Create app/photos/[roomSlug]/[workTypeSlug]/page.tsx composing them"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phases 1–4 (Setup, Supabase, Auth, Data Layer).
2. Complete Phase 5 (US1 — view photos).
3. **STOP and VALIDATE**: run quickstart.md Scenarios 1–2 against a real Supabase project.
4. Deploy/demo if ready.

### Incremental Delivery (per the requested ordering)

1. Phases 1–4 → foundation ready.
2. Phase 5 (US1) → Phase 6 (US2) → demo viewing (MVP+).
3. Phase 7 (US3) → Phase 8 (US4) → demo upload.
4. Phase 9 (US6) → demo delete.
5. Phase 10 (US5) → demo edit.
6. Phase 11 → deploy to production, run full quickstart.md, ship.

---

## Notes

- [P] tasks touch different files and have no incomplete-task dependency.
- Tasks that edit the same file (e.g. `app/actions/photos.ts` across T028/T034/T038) are never marked [P] relative to each other, even across phases.
- Every task names its exact file(s) and a concrete "Done when" — no task should require re-reading this conversation for context.
- Commit after each task or logical group; stop at any Checkpoint to validate a story independently.
