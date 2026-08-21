# Phase 0 Research: Bulk Multi-File Upload with Drag-to-Categorize

## Decision 1: Native HTML5 Drag and Drop API, no new dependency

**Decision**: Implement desktop drag assignment with the browser's built-in `draggable`/`dragstart`/`dragover`/`drop` events, the same primitives used in the interactive mockups already validated with the account holder.

**Rationale**: The interaction is single-item drag onto a fixed set of static drop targets (room tabs, work-type bins) — not sortable-list reordering, not multi-column Kanban, not touch-drag (mobile explicitly uses a different, tap-based mechanism per User Story 2). That's squarely within what the native API handles without the edge cases (touch emulation, keyboard accessibility, virtualized lists) that justify a library like `dnd-kit` or `react-beautiful-dnd`. This project has no existing drag dependency; adding one for this scope would be more surface area than the problem needs.

**Alternatives considered**: `dnd-kit` — capable but solves a harder problem (sortable lists, touch support) than this feature has, and touch is explicitly out of its scope here since mobile uses tap-select instead.

## Decision 2: Client-side in-flight de-dup for week resolution, keyed by the bin

**Decision**: `lib/upload-session.ts` exposes a small cache keyed by `` `${roomId}::${workTypeId}::${startDate}::${endDate}` `` mapping to either a resolved `weekId` or an in-flight `Promise<weekId>`. The first assignment into a given bin during the session triggers `resolveWeekForDrop`; any assignment into the *same* bin that arrives before that call resolves awaits the same promise instead of firing a second one.

**Rationale**: Without this, two files dropped into the same empty bin in quick succession could both observe "no week exists yet" (via `getWeeks`) and both call `createWeek`, which computes `week_number` as "current max + 1" from a separate read — a classic read-then-write race that could create two different weeks with the *same* date range for the same room/work-type (the schema's `unique(room_id, work_type_id, week_number)` constraint doesn't prevent this, since the two inserts would get different `week_number` values). Serializing on the client is sufficient here because the only actor creating weeks through this page is the single signed-in user driving their own browser session — this isn't a multi-writer concurrency problem requiring a database-level fix, just a same-tab double-fire to guard against. Scoped explicitly to this feature; no schema change.

**Alternatives considered**: A DB-level unique constraint on `(room_id, work_type_id, start_date, end_date)`. Rejected as out of scope — the spec frames `weeks` as "reused not redefined," and the existing `local` backend's week creation has the identical race in theory with no reported problem in practice; a client-side guard matches the existing risk posture rather than introducing a schema migration for a same-session, single-user race.

## Decision 3: Mobile assignment — tap-select then a two-step bottom sheet

**Decision**: Tapping a tray file toggles its selection (checkmark overlay, multi-select supported). A persistent action bar appears once ≥1 file is selected, opening `MobileAssignSheet` on tap: step one lists the 6 rooms, step two (after picking a room) lists that room's 7 work types. Confirming assigns all currently-selected files to that (room, work type) in one action.

**Rationale**: Matches the desktop room-tab-then-work-type-bin structure conceptually (room first, then work type — same mental model, different input gesture), satisfying FR-005's "produces the same result as the drag gesture." Multi-select-then-assign lets a phone user sort ten photos from the same wall in one action instead of ten separate taps-and-sheets, which matters more on mobile than desktop since drag is inherently one-at-a-time there anyway.

**Alternatives considered**: A single combined room+work-type picker (one flat list of 42 entries) instead of two steps. Rejected — 42 items in one scrollable sheet on a phone is worse than two short lists of 6 and 7.

## Decision 4: Batch-chunk mobile multi-assign at the existing 20-file limit

**Decision**: When a mobile multi-select assignment targets more than `MAX_BATCH_FILES` (20, `lib/validation.ts`) files at once, `lib/upload-session.ts` splits them into sequential chunks of ≤20 and calls `uploadPhoto` once per chunk against the same resolved `weekId`.

**Rationale**: `uploadPhoto`'s existing Zod schema already caps a single call at 20 files (`fileArray()` in `lib/validation.ts`) — this is an existing, untouched rule (Constitution VIII), not something this feature loosens or re-implements. Chunking client-side is the minimal accommodation so a large mobile multi-select doesn't just fail outright.

## Decision 5: Preview thumbnails — object URLs for images, an icon for video

**Decision**: For image files, generate a preview via `URL.createObjectURL(file)`, revoked when the tray item is removed (uploaded or the page unmounts) to avoid leaking memory across a large batch. For video files, show a static video icon instead of attempting a frame-extraction thumbnail.

**Rationale**: `URL.createObjectURL` is instant and needs no server round-trip, appropriate for a tray that might hold dozens of files before any upload happens. Video frame extraction (e.g., via a hidden `<video>` + `<canvas>` seek) is real added complexity for a cosmetic detail the spec doesn't require — an icon is sufficient to distinguish "this one's a video" in the tray.

## Decision 6: Entry point — a new link in the existing account menu, editor+ only

**Decision**: Add "อัปโหลดรูปหลายไฟล์" to `components/AccountMenu.tsx`, gated by `canEdit(role)` (not `isAdmin`), pointing to `/upload` — placed alongside the existing `isAdmin(role) &&` admin-users link, using the identical conditional-link pattern already in that file.

**Rationale**: `AccountMenu.tsx` already conditionally renders role-gated navigation links (the admin-users link, gated by `isAdmin`) — reusing that exact pattern for `canEdit` is the smallest, most consistent way to surface a new editor-level page, and matches the spec's Assumption that nav placement is a presentation detail, not a new navigation structure.

**Alternatives considered**: A prominent button on the room/work-type browsing pages themselves. Rejected as a bigger visual change to existing, working pages than this feature calls for — the account menu is where role-gated capabilities already live in this app.

**Amendment (post-launch)**: the same link was also added to the main `Sidebar`/`SidebarSwitcher` (both desktop and mobile), gated identically by `canEdit(role)`, threaded down from `app/(app)/layout.tsx`'s existing `getCurrentUser()` call. The account menu alone turned out to be too easy to miss for a page someone would return to repeatedly (unlike the one-off admin-users link) — the sidebar is where users already look for navigation on every page.

## Decision 7: Tray preview size — three modes, not a full file-manager view menu (User Story 4)

**Decision**: A small toggle with exactly three options — "รูปใหญ่" (large thumbnails, fewer columns), "รูปกลาง" (medium thumbnails, the original default), "รายการ" (list: small thumbnail + full file name per row). State lives locally in `UnsortedFileTray` (a display preference, not part of the upload session — data-model.md's "Tray display preference").

**Rationale**: The account holder's own reference point was Windows File Explorer's view menu (extra large/large/medium/small icons, list, details, tiles, content — 8 options), but the two underlying needs they described were narrower: (1) see the photo clearly enough to tell it apart from similar ones, and (2) read a file name directly when it already encodes a date. Three modes cover both without the maintenance and decision cost of matching File Explorer's full menu, most of which (tiles, content, details columns) don't map to anything this tray needs to show.

**Alternatives considered**: Matching File Explorer's full 8-option menu. Rejected as scope beyond what either stated need requires — extra options with no corresponding user need are clutter, not fidelity.

## Decision 8: Two-column layout with a sticky assignment panel (User Story 4)

**Decision**: On screens wide enough (`lg:` breakpoint, ~1024px+), the workspace splits into a flexible-width left column (the tray) and a fixed ~320px right column (room tabs + work-type bins) that stays pinned (`position: sticky`) as the left column scrolls. Below that breakpoint (including all mobile sizes), the layout stays single-column/stacked, unchanged from the original design.

**Rationale**: The reported problem was specifically that a long tray pushed the assignment controls below the viewport, forcing a scroll-down-then-back-up cycle for every single sort action — the opposite of the "fast sort-as-you-go" point of this feature. A sticky side panel keeps the drop targets on-screen regardless of tray length, which a taller max-height/scrollable-tray-only approach would also achieve, but a side-by-side split additionally matches what the account holder asked for directly ("list รูปอยู่ซ้าย กล่องเลือกห้องกล่องหมวดหมู่อยู่ขวา"). Mobile is intentionally excluded from this change — User Story 2's tap-select-then-bottom-sheet flow doesn't have this problem in the first place (the sheet opens over the whole screen on demand rather than living in a fixed-position panel).

**Alternatives considered**: A `max-height` + internal scroll on the tray only, leaving the single-column stacked layout otherwise unchanged. Rejected as a smaller change that doesn't match what was explicitly requested (side-by-side, not a capped-height tray), even though it would have also technically solved the "pushed off-screen" problem.

## Decision 9: Mobile flow replaced with a one-at-a-time review card (User Story 2 revision)

**Decision**: `components/MobileAssignSheet.tsx` (tap-select-many + two-step bottom sheet) is deleted and replaced by `components/MobileSwipeCard.tsx`: one large photo shown at a time, room chips and work-type chips below it, Previous/Next navigation (buttons and pointer-drag/swipe), and an explicit "เพิ่มรูปนี้เข้าห้อง/หมวดนี้" (add this photo to this room/category) action. `components/UnsortedFileTray.tsx` drops its tap-select affordance entirely (`selectedIds`/`onToggleSelect` removed) since nothing on desktop consumes a selection anymore either — desktop assignment is drag-only, as it always was; the multi-select mechanism existed solely to feed the now-removed sheet.

**Rationale**: Live use of the original design surfaced two real problems the small-thumbnail-grid-plus-sheet design couldn't fix without becoming a different design: (1) thumbnails were too small to tell photos apart, which the tray's later `viewMode` toggle (Decision 7) only partially addresses on a phone-width screen; (2) a photo could only go to one room/work-type, with no reasonable way to add it to a second — the account holder wanted this ("1 รูปหลายหมวด"), and the tap-select-many model has no natural place to put a "do this again for a different category" action. A one-at-a-time card is both bigger (full card width, not a grid cell) and naturally revisitable (navigate back, pick a different bin, add again).

**Alternatives considered**: A "ทำสำเนา" (duplicate) button on each grid chip, creating a second independent tray entry the user then assigns separately. This was floated first and would also solve the multi-bin problem, but the account holder specifically asked for the swipe-card pattern once they saw it could solve the *legibility* problem at the same time — one design solving two stated problems beat two separate mechanisms.

## Decision 10: Navigation and "add" are separate, independent actions (User Story 2 revision)

**Decision**: Moving between cards (swipe or arrow buttons) never uploads, assigns, or resets anything. The room/work-type selection is `useState` local to `MobileSwipeCard`, initialized once and left alone by navigation — it only changes when the account holder taps a different chip. The "add" button reads whatever is currently selected and calls `assignFileKeepInTray` for the *currently displayed* card only; it does not advance the card afterward.

**Rationale**: Explicit, direct instruction from the account holder: selection must survive browsing so the account holder can check other photos without losing their in-progress choice, and decoupling "add" from "next" is what makes adding the *same* photo to a second category (Decision 9) a two-tap operation (navigate back, tap add again) instead of requiring a re-select each time. An earlier version of this design (shown as a mockup) combined "confirm" with "advance to next card"; the account holder asked for them to be split after seeing it.

**Alternatives considered**: Auto-advance after add, with a separate "add another category" affordance for the multi-bin case. Rejected once the account holder clarified they wanted plain navigation (swipe/arrows) to be the only way the card changes, full stop — no implicit advancement tied to the add action.

## Decision 11: `confirmedFor` tracked per file instead of removing on success (User Story 2 revision)

**Decision**: `UnsortedFile` gains `confirmedFor: Array<{roomId, workTypeId}>`. `assignFileKeepInTray` (the mobile add path) appends to this array and resets `status` back to `"waiting"` on success, but never removes the file from `files` state — unlike `assignFiles` (the desktop drag path), which still removes on success, per User Story 1's unchanged "leaves the unsorted tray" behavior. `MobileSwipeCard` reads `confirmedFor` both to render "already added" badges and to block re-adding the exact same combination (FR-017) with a clear message instead of a silent duplicate upload.

**Rationale**: The desktop and mobile flows now have genuinely different lifecycle semantics for "assigned" (remove vs. stay-and-accumulate), driven directly by the multi-bin requirement being mobile-only. Keeping this as a field on the shared `UnsortedFile` type (rather than a parallel mobile-only data structure) keeps both flows reading/writing one source of truth for a given file's state, which matters if a future iteration ever wants desktop to gain the same multi-bin capability.

**Alternatives considered**: A count instead of a list (`addedCount: number`). Rejected — the badges need to *show which* room/work-type combinations were used, not just how many, and the duplicate check (FR-017) needs to compare against specific combinations, not a count.

## Decision 12: Room selector wraps instead of scrolling, and gains section labels (User Story 4 amendment)

**Decision**: `RoomTabBar.tsx` changes from `flex overflow-x-auto` (horizontal scroll) to `flex flex-wrap` inside a bordered box, matching how the work-type bin grid already wraps. The desktop/tablet panel also gains the same small "ห้อง" / "หมวดงาน" labels `MobileSwipeCard` already shows above its own room chips and work-type chips.

**Rationale**: Direct feedback — a horizontal scrollbar on a short, fixed list of 6 rooms read as visual clutter ("ไม่มินิมอล"), not as an affordance; wrapping keeps every room visible without a scroll gesture, matching the work-type grid's existing (non-scrolling) behavior right next to it. The labels are a small consistency fix once both platforms' controls are conceptually the same two choices (room, then work type) — no reason for one to be unlabeled while the other names them explicitly.

**Alternatives considered**: None seriously — this was a small, unambiguous fix matching an existing sibling pattern (the work-type grid) already in the same file.
