# Quickstart: Bulk Multi-File Upload with Drag-to-Categorize

Prerequisites: dev server running, signed in as an `editor` or `admin` account.

## Scenario 1 — Desktop drag sort, end to end (US1)

1. Go to the account menu → "อัปโหลดรูปหลายไฟล์" → lands on `/upload`.
2. Enter a start/end date not already used for any room+work-type combination.
3. Add 5-6 files via the file picker or by dragging them from the desktop onto the tray.
4. Drag one file onto a work-type bin under the default active room.
5. Drag another file onto a different room's tab, then onto a work-type bin in that room.

**Expected**: Each dropped file shows a brief loading state then disappears from the tray; each target bin's count increments; switching room tabs changes which 7 bins are shown, tray files carry over unaffected.

## Scenario 2 — Reusing a week across multiple drops (US1 Acceptance Scenario 6)

1. Continuing from Scenario 1, drag a second file onto the same room/work-type bin used in step 4.

**Expected**: No new week is created (verify via a direct query: `select count(*) from weeks where room_id = ... and work_type_id = ... and start_date = ...` stays at 1); the bin's count is now 2.

## Scenario 3 — Overlap rejection still applies (Edge Case)

1. Pick a date range that overlaps an existing week for some room+work-type (e.g. reuse a range already imported by specs/014).
2. Drag a file onto that specific room+work-type bin.

**Expected**: The file shows an error state with the same overlap message `createWeek` already produces elsewhere on the site — not a silent failure, not a duplicate week.

## Scenario 4 — Mobile one-at-a-time review and add (US2, revised)

1. Resize to a phone-sized viewport (or use a real device).
2. Add a batch of 3+ files.
3. Confirm one photo is shown large, with room chips and work-type chips beneath it, and Previous/Next controls.
4. Swipe or tap Next/Previous a few times without touching any chip or the add button.

**Expected**: Photo changes; the previously-selected room/work-type chips stay selected exactly as they were — nothing uploads and nothing resets just from navigating.

5. Return to the first photo, pick a room + work type, and press "เพิ่มรูปนี้เข้าห้อง/หมวดนี้".

**Expected**: The photo uploads (brief loading state on the card), a badge appears showing that room/work-type combination as added, and the card does **not** advance automatically — still showing the same photo.

6. On the same photo, pick a *different* room or work type and press the add button again.

**Expected**: A second badge appears; the photo is now confirmed for two combinations. Query `photos` for that file's underlying content — two independent rows exist, one per (room, work type, week).

7. Try adding the same photo to the *first* combination again (same room, same work type as step 5).

**Expected**: A clear "already added" message appears; no second upload happens for that combination (still just the two rows from steps 5-6).

## Scenario 4b — Desktop/tablet room selector: no scrollbar, labeled sections (US4 amendment)

1. On a desktop or tablet-width window, open `/upload`.
2. Confirm the room selector and work-type selector each have a small label above them ("ห้อง", "หมวดงาน") matching the mobile version's wording.
3. If the room list is wide enough to wrap, confirm it wraps to a second line inside its box rather than showing a horizontal scrollbar.

**Expected**: No horizontal scrollbar anywhere in the room selector; labels present and matching mobile's wording.

## Scenario 5 — One bad file doesn't block the rest (US3)

1. Add a batch that includes one file of a rejected type (e.g. a `.txt` file) alongside valid photos.
2. Assign the whole batch (drag each on desktop, or add each on mobile).

**Expected**: The invalid file shows its own clear error and stays in the tray (or shows a retry-not-applicable rejection); every valid file in the same action still uploads successfully.

## Scenario 6 — Sorted photos are indistinguishable from normal uploads (SC-005)

1. After Scenario 1, navigate to the normal browsing page for one of the rooms/work-types used.

**Expected**: The photo appears there exactly as if it had been uploaded through the existing single-room `PhotoUploader`, under a week whose displayed date range matches what was entered in step 2 of Scenario 1.

## Scenario 7 — Large batch stays usable (US4, SC-006)

1. Add 30+ files to the tray.
2. Switch between the three view-mode buttons above the tray (large / medium / list).
3. On a desktop-sized window, scroll down through the tray.

**Expected**: Each view mode renders without errors; "list" mode shows each file's full name; "large" mode shows visibly bigger previews than "medium". While scrolling the tray, the room tabs and work-type bins on the right stay in place (sticky) rather than scrolling out of view. On a phone-sized viewport, this grid tray isn't shown at all — the mobile layout is the one-at-a-time card from Scenario 4.
