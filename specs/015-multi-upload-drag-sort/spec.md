# Feature Specification: Bulk Multi-File Upload with Drag-to-Categorize

**Feature Branch**: `015-multi-upload-drag-sort`

**Created**: 2026-07-14

**Status**: Draft

**Input**: User description: "A dedicated page where an editor picks a date range once, drops in many photos/videos from a site visit at once, and sorts each one into the right room and work type by dragging it onto a room tab and a work-type bin (tap-to-select-then-assign on mobile) — each photo uploads the moment it's sorted, not at the end."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sort a whole site visit's photos in one sitting (Priority: P1)

An editor comes back from a site visit with dozens of photos and videos covering several rooms and several kinds of work, all from the same few days. Today they have to open each room's page, switch to each work type's tab, and upload the matching handful of files — repeated many times for one visit. Instead, they want to set the date range once, dump everything in, and sort it all from one screen.

**Why this priority**: This is the entire reason the feature exists — without it, the editor is back to the current repetitive one-room-one-work-type-at-a-time flow this feature is meant to replace.

**Independent Test**: Pick a date range, add a batch of files, sort each one into a room + work type by dragging, and confirm every sorted file appears in the right place on the site's normal browsing pages afterward.

**Acceptance Scenarios**:

1. **Given** the editor is on the new upload page, **When** they enter a start and end date, **Then** that date range applies to every photo they sort during this session — they are not asked to re-enter it per photo.
2. **Given** several files have been added and are waiting, unsorted, **When** the editor drags one onto a specific room's work-type bin, **Then** that file uploads immediately, disappears from the unsorted area, and the bin's count goes up by one.
3. **Given** the editor wants a different room than the one currently showing its work-type bins, **When** they drag an unsorted file onto that other room's tab, **Then** the view switches to that room's work-type bins so they can then drop the file into the right one.
4. **Given** two different rooms both end up with photos filed under the same date range and the same work type, **When** the editor sorts photos into both, **Then** both are correctly saved under their own room, without mixing into each other.
5. **Given** the editor sorts a file into a room/work-type combination that has never had a week with this exact date range before, **When** the file is dropped, **Then** a new week is created for that combination using the date range from step 1, and the file is filed into it.
6. **Given** a room/work-type combination already has a week with this exact date range (from earlier in the same session or from before), **When** another file is dropped into that same bin, **Then** it's added to the existing week — no duplicate week is created.

---

### User Story 2 - Sorting works just as well on a phone (Priority: P1)

*Revised after initial delivery.* The original design for this story was a small-thumbnail grid with tap-to-select-several, then a bottom sheet to pick a room and work type for the whole selection. Live use surfaced two problems with that design: small thumbnails were hard to tell apart on a phone screen, and a photo could only ever go into one room/work-type — with no way to put the same photo into a second category without a clumsy re-select. This story's design below **replaces** that original approach; it does not sit alongside it.

Most of this app's use happens on mobile. An editor on their phone, right after a site visit, wants to review their photos one at a time, large enough to actually see, and be able to file a photo into more than one category when it genuinely belongs in more than one (e.g. a wide shot that shows both flooring and electrical work).

**Why this priority**: If this only works with a mouse, it fails this project's mobile-first users on day one — equal priority to User Story 1, not a follow-up.

**Independent Test**: On a phone-sized screen, add a batch of files, review them one at a time, and file at least one photo into two different room/work-type combinations.

**Acceptance Scenarios**:

1. **Given** the editor is on a phone-sized screen with unsorted files added, **When** they view the page, **Then** exactly one photo is shown at a time, large enough to make out its content, with room and work-type choices shown beneath it and a way to move to the next or previous photo.
2. **Given** the editor moves between photos (forward or back), **When** they do so, **Then** the room/work-type choice currently shown does not reset or change on its own, and nothing is uploaded or assigned purely by moving between photos.
3. **Given** a room and work type are selected for the photo currently shown, **When** the editor presses the action to add it, **Then** that specific photo uploads into that room/work-type/date-range combination immediately, and the editor stays on the same photo (moving to another photo is a separate, deliberate action).
4. **Given** a photo was already added to one room/work-type combination, **When** the editor (having navigated back to that same photo) selects a different room or work type and presses add again, **Then** the photo is also added to that second combination — both additions exist independently, and the photo still shows both as done.
5. **Given** a photo has already been added to a specific room/work-type combination, **When** the editor tries to add it to that exact same combination again, **Then** the system tells them clearly that it's already been added, rather than silently creating a second, identical upload.

---

### User Story 3 - A rejected or failed file doesn't block the rest of the batch (Priority: P2)

Not every file in a big batch is guaranteed to be a valid, uploadable photo or video, and any single upload can fail for reasons outside the editor's control (a flaky connection, for instance). The editor needs to see exactly which file had a problem and keep working with the rest.

**Why this priority**: Without this, one bad file in a batch of fifty could look like the whole batch silently failed, undermining trust in the tool — but it's a resilience layer on top of the core sorting flow (User Stories 1-2), not the primary value.

**Independent Test**: Include one intentionally invalid file in a batch, sort it along with valid ones, and confirm only the invalid one shows an error while the rest succeed.

**Acceptance Scenarios**:

1. **Given** a file of a type or size the site doesn't accept is in the unsorted batch, **When** the editor tries to sort it into a bin, **Then** that specific file shows a clear error explaining why, and stays visible so the editor knows it didn't make it in.
2. **Given** a file's upload fails for a transient reason after being dropped into a bin, **When** the failure happens, **Then** that file shows a retry option without affecting any other file already sorted or still waiting.

---

### User Story 4 - The tray stays readable and the assignment panel stays reachable in a large batch (Priority: P2)

*Added after initial delivery, from the account holder's own first real use of the page — not part of the original request, but real feedback on a real problem.* Small thumbnails made it hard to tell photos apart at a glance, especially since some files are already named with a date the account holder wanted to read directly. Separately, once enough files were added, the room/work-type assignment area was pushed far down the page, below the growing tray — defeating the point of a fast sort-as-you-go flow.

**Why this priority**: Both issues make User Story 1 (the core value of this feature) painful at real-world batch sizes, but neither blocks the feature from functioning — a polish/usability layer on an already-working flow, not a new capability.

**Independent Test**: Add a large batch (30+ files), switch between the available preview sizes and confirm each is legibly different, and confirm the room/work-type panel remains visible and reachable without scrolling past the tray.

**Acceptance Scenarios**:

1. **Given** a batch of files in the tray, **When** the editor switches between the available preview sizes, **Then** at least one size shows large enough previews to tell photos apart, and at least one shows the file name directly (for files already named with identifying information like a date), without needing more than these few straightforward choices.
2. **Given** a large batch of files fills the tray well past one screen's height, **When** the editor scrolls through the tray on a screen wide enough for a side-by-side layout, **Then** the room tabs and work-type bins remain visible and usable without the editor having to scroll past the tray to reach them.
3. **Given** a phone-sized screen, **When** the editor uses the page, **Then** the layout is whatever User Story 2 currently specifies — this story's layout change applies to larger screens only.
4. **Given** the room selector on a screen wide enough for the side-by-side layout, **When** the list of rooms doesn't fit on one line, **Then** it wraps onto additional lines within its own box rather than scrolling, and both the room selector and the work-type selector are labeled the same way the phone version labels them ("ห้อง", "หมวดงาน").

---

### Edge Cases

- Choosing a date range that would overlap an existing, different week already on the site for a room/work-type combination the editor sorts a photo into: the existing site-wide rule against overlapping weeks for the same room + work type still applies here — the editor sees the same kind of clear rejection they'd see from the existing single-room upload page's week picker, not a silent failure or a duplicate.
- Leaving the page (navigating away or closing the tab) while files are still unsorted: anything already added to a bin — via desktop drag (User Story 1) or the mobile add action (User Story 2) — has already been saved; anything never added to any bin is only in the browser and is lost — this is the same as any other in-progress, not-yet-submitted form.
- A very large batch (tens of files) added at once: the page must stay usable — the unsorted area scrolls/paginates rather than becoming unusably long, and sorting one file's outcome doesn't require waiting for others in the same batch to finish.
- Someone without editor/admin access reaching this page directly by URL: blocked the same way every other edit-capable page on this site already blocks viewers.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST let the user set one date range at the start of a session, applied to every file sorted during that session without re-entry.
- **FR-002**: The system MUST let the user add many photo/video files at once (multi-select and/or drag-from-desktop) before any of them is assigned a room or work type.
- **FR-003**: Added files MUST NOT be uploaded/saved to the site until each one has been individually assigned both a room and a work type.
- **FR-004**: The system MUST let the user assign a waiting file to a room and a work type via a drag gesture on pointer-capable devices.
- **FR-005** *(revised, User Story 2)*: The system MUST let the user assign the currently-shown file to a room and a work type via a tap-based interaction on touch devices, without requiring a drag gesture.
- **FR-006**: The system MUST upload a file immediately once it is assigned a room and work type, not wait for the rest of the batch or a separate submit action.
- **FR-007**: The system MUST show a per-file loading state while its upload is in progress and a per-file, retry-capable error state if it fails — never a silent failure and never a batch-wide failure for one file's problem.
- **FR-008**: The system MUST resolve each (room, work type, chosen date range) combination to a single, correct week: reusing one that already has that exact date range, or creating a new one if none does.
- **FR-009**: The system MUST enforce the same existing rule against overlapping date ranges within the same room + work type when creating a new week from this page — not a separate or looser rule.
- **FR-010**: The system MUST apply the same file-type and file-size acceptance rules the site's existing upload already enforces, per file, so an invalid file is rejected with a clear reason rather than silently accepted or silently dropped.
- **FR-011**: The system MUST restrict access to this page to accounts with editor or admin permission, consistent with every other content-adding capability on this site.
- **FR-012**: The system MUST let the user see, at a glance, how many files remain unsorted and how many have been placed in each room/work-type combination during the current session.
- **FR-013** *(added, User Story 4)*: The system MUST let the user switch the unsorted tray between a small number of preview sizes/styles, including at least one that shows the file name directly, without the choice affecting which files exist or their sort status.
- **FR-014** *(added, User Story 4)*: The system MUST keep the room/work-type assignment controls reachable without scrolling past the unsorted tray, on screens wide enough to show both side by side.
- **FR-015** *(added, User Story 2 revision)*: On touch devices, moving to the next or previous file MUST NOT change the currently-selected room/work type and MUST NOT itself assign or upload anything.
- **FR-016** *(added, User Story 2 revision)*: On touch devices, adding a file to a room/work type MUST NOT remove that file from the reviewable set, so the same file can be added to more than one room/work-type combination.
- **FR-017** *(added, User Story 2 revision)*: The system MUST prevent the exact same file from being added to the exact same room/work-type combination more than once, telling the user clearly instead of silently creating a duplicate.
- **FR-018** *(added, User Story 4 amendment)*: The room selector on screens wide enough for the side-by-side layout MUST fit within its container by wrapping to additional rows, not by scrolling horizontally.

### Key Entities

- **Upload session**: The in-browser, not-persisted state of one visit to this page — the chosen date range, the set of added-but-not-yet-sorted files, and the running per-bin counts. Exists only in the browser until files are individually sorted; nothing about the session itself is saved.
- **Unsorted file**: A file the user has added — has a name, a preview, a status (waiting, uploading, or error with a reason), and the set of room/work-type combinations it has already been added to (on touch devices, this can be more than one — see User Story 2). On pointer-capable devices, a file that's been added to a bin leaves the browsable set (single destination via drag); on touch devices it stays reviewable so it can be added again.
- **Week** *(existing entity, reused not redefined)*: The (room, work type, date range) grouping every photo already belongs to elsewhere on the site — this feature creates or reuses these, it does not introduce a new grouping concept.
- **Tray display preference** *(added, User Story 4)*: A display-only, per-visit choice of preview size/style for the unsorted tray — not part of the upload session's saved outcome, purely how the same underlying file list is rendered.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An editor can sort a batch of 20 mixed-room, mixed-work-type photos from one site visit into their correct places without leaving this single page.
- **SC-002**: Sorting a photo into its room and work type, from the moment of the drag/tap action to the photo appearing as saved, feels immediate — no separate "submit the batch" step is ever required.
- **SC-003** *(revised, User Story 2)*: The same sorting task (add a batch, assign each file — including filing one photo into more than one room/work-type when needed) can be completed entirely on a phone-sized screen using only tap interactions, with no functionality only reachable via drag.
- **SC-004**: A single invalid or failed file in a batch of many never prevents the other files in that same batch from being successfully sorted and uploaded.
- **SC-005**: Photos sorted through this page are indistinguishable, when viewed afterward on the site's existing browsing pages, from photos added through the existing single-room upload flow.
- **SC-006** *(added, User Story 4)*: On a large batch (30+ files) and a screen wide enough for a side-by-side layout, the editor never has to scroll down past the tray to find the room/work-type assignment controls.

## Assumptions

- This page is reached via a new entry point in the site's existing navigation (exact placement is a presentation detail for the planning phase, not a product decision needing a functional requirement) — no existing page's navigation structure is being redesigned to make room for it. **Resolved**: a role-gated link ("อัปโหลดรูปหลายไฟล์") was added to both the account menu and the main sidebar (desktop and mobile switcher), visible only to editor/admin accounts.
- "Room" and "work type" mean the exact same fixed set of rooms (including the four cold-room sub-rooms) and work types (including doors) already defined elsewhere on the site — this feature does not add, remove, or rename any of them.
- The visual design (colors, components, Thai copy conventions) matches the site's current look exactly — this feature is new capability only, not part of the separately-planned "Phase 2.2" visual redesign, which remains untouched.
- A file that fails validation (wrong type/too large) is discovered at the moment the user tries to sort it into a bin, not earlier at add-time — consistent with how this project's existing upload flow validates at upload time, per file.
- "Immediately" (FR-006) means the upload begins as soon as the assignment action (drop or tap-assign) completes — real upload duration still depends on file size and network conditions, same as the existing single-room upload.
