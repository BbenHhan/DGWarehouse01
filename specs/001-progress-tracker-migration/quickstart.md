# Quickstart: Progress Tracker Web Migration

Manual validation guide — no automated test suite was requested for this feature
(see [plan.md](./plan.md) Technical Context). Use this to confirm each user story
from [spec.md](./spec.md) works end-to-end after implementation.

## Prerequisites

1. A Supabase project with the schema, RLS policies, and storage buckets from
   [contracts/supabase-setup.md](./contracts/supabase-setup.md) applied.
2. `.env.local` populated with `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. One Supabase Auth user provisioned (Bell's account) for sign-in.
4. `rooms`, `work_types`, `document_categories` seeded per
   [data-model.md](./data-model.md) (the six rooms, six work types, four หมวด).
5. `npm install && npm run dev`, app reachable at `http://localhost:3000`.

## Scenario 1: Sign in (Principle VII)

1. Visit `/login`, request a magic link for Bell's email (or use Google OAuth).
2. Follow the link → land on `/photos` signed in.
3. **Expected**: no anonymous route is reachable without a session; visiting
   `/photos` while signed out redirects to `/login`.

## Scenario 2: View photos by room → work type → week (US1)

1. From `/photos`, select 🏠 ห้องแรก, then the 🧱 Firewalls tab.
2. Pick a week that has seed/test photos.
3. **Expected**: PhotoGrid shows exactly that week's photos (data-model.md
   `Week` → `Photo` relationship).
4. Tap a photo → Lightbox opens full-screen; navigate next/previous within the
   same week.
5. Pick a week with no photos → **Expected**: empty state with an upload prompt.

## Scenario 3: View documents by category (US2)

1. Go to `/documents/structure` (หมวดที่ 1).
2. **Expected**: DocList shows only documents in that category.
3. Open a PDF → previews inline; open a DOCX/XLSX → downloads.

## Scenario 4: Upload photos, single and batch (US3)

1. In a week's PhotoGrid, open PhotoUploader and select 5 photos at once.
2. **Expected**: loading state shown; on completion all 5 appear without a
   manual page refresh (SC-002).
3. Repeat with one intentionally invalid file (e.g. a `.txt` renamed to `.jpg`
   or an oversized file) mixed into the batch.
4. **Expected**: valid files succeed, the invalid one is reported as failed,
   per `uploadPhoto`'s `results` array (contracts/server-actions.md).

## Scenario 5: Upload a document (US4)

1. In a หมวด's DocList, open DocUploader and upload one PDF.
2. **Expected**: loading state, then the document appears in that category.

## Scenario 6: Edit — rename, note, move (US5)

1. Open EditModal on an existing photo. Rename it, add a note, save.
2. **Expected**: new name and note visible immediately in PhotoGrid/Lightbox.
3. Move the same photo to a different week (via EditModal's move control).
4. **Expected**: photo disappears from the original week and appears under the
   new week.
5. Repeat move for a document across two หมวด categories.

## Scenario 7: Delete (US6)

1. Delete a photo; confirm in the dialog.
2. **Expected**: photo disappears from the grid within ~1 second (optimistic UI,
   SC-003), before waiting for any network round trip to visibly finish.
3. Delete another photo but cancel the confirmation.
4. **Expected**: photo remains untouched.
5. Reload the page after a confirmed delete.
6. **Expected**: deleted item does not reappear (permanently removed).

## Scenario 8: Mobile responsiveness (Principle IV, SC-004)

1. Resize the browser (or use device emulation) to a 375px-wide mobile viewport.
2. Repeat Scenarios 2–7.
3. **Expected**: no horizontal scrolling, no broken layout, all actions remain
   usable.

## Scenario 9 (optional): v7 data import

1. Run `supabase/seed/seed-from-v7.ts` against a local copy of the v7 folder
   structure.
2. **Expected**: photos and documents from the local folders appear correctly
   grouped by room/work-type/week or หมวด after the script completes.
