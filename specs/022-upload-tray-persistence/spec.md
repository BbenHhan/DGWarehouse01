# Feature Specification: Upload Tray Persistence

**Feature Branch**: `main`

**Created**: 2026-08-19 (retroactively documented 2026-08-21)

**Status**: Implemented

**Input**: "รูปที่อัพโหลดแล้วแต่อยู่ระหว่างรอจำแนกอ่ะ พอ server down หรือ refresh หน้าหรือไปหน้าอื่นกลับมาหน้าเดิมแล้วรูปมันหายอ่ะ ช่วยทำให้มันไม่หายได้ไหม" — files added to the bulk-upload page's tray but not yet sorted into a room/work-type bin were being silently lost on page refresh, navigating away and back, or the local dev preview server restarting mid-session, forcing a re-pick from the camera roll. Raised while the account holder was preparing to sort 100+ real photos and was worried about losing in-progress work.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Not-yet-sorted files survive a refresh or restart (Priority: P1)

**Why this priority**: This was a real, already-experienced data-loss risk right before a large real sorting session — the highest-stakes bug reported this session in terms of potential wasted user effort.

**Independent Test**: On `/upload`, add several files to the tray without sorting them into any bin; refresh the page; confirm the same files reappear in the tray, with a visible confirmation of how many were restored.

**Acceptance Scenarios**:

1. **Given** files added to the tray but not yet sorted, **When** the page is refreshed, **Then** every one of those files reappears in the tray.
2. **Given** the same situation, **When** the browser tab is closed and a new one opened to `/upload`, **Then** the files still reappear (survives more than just a soft refresh).
3. **Given** a file was already sorted into a bin (successfully uploaded), **When** the page is refreshed, **Then** it does NOT reappear in the tray (only genuinely not-yet-sorted files persist).
4. **Given** a file is mid-upload (status "uploading") at the moment of a refresh, **When** the page reloads, **Then** it comes back as "waiting" (not stuck showing a stale "uploading" state), so the person can retry sorting it normally.

### User Story 2 - The chosen upload date is remembered too (Priority: P3)

**Why this priority**: A small, low-risk convenience addition bundled into the same fix since it uses the same "don't reset on reload" principle, not a separate significant risk.

**Independent Test**: Change the upload date away from today; refresh the page; confirm the previously chosen date is still shown, not reset to today.

**Acceptance Scenarios**:

1. **Given** a non-default date was chosen, **When** the page reloads, **Then** that same date is still selected.

### Edge Cases

- If the browser's persistent storage is unavailable (private/incognito mode in some browsers, storage disabled), the page must still work for the current session — it just won't survive a reload, the same as before this feature existed. No error should block normal use.
- Duplicating a file in the tray (existing capability) must persist the duplicate as its own independent entry too.
- A file added to multiple room/work-type bins on mobile (the "add to several categories" capability) must have its up-to-date list of already-added categories persisted, not just its original state.

## Requirements *(mandatory)*

- **FR-001**: Every file added to the tray MUST be persisted to durable, client-side storage at the moment it's added.
- **FR-002**: A file removed from the tray (successfully sorted, or explicitly discarded) MUST be removed from that persisted storage too.
- **FR-003**: On loading the upload page, any persisted not-yet-sorted files MUST be restored into the tray automatically, with a visible confirmation of how many were restored.
- **FR-004**: Restored files MUST always come back in a "waiting" state, regardless of what state they were in when persisted.
- **FR-005**: The chosen upload date MUST be remembered across a reload.
- **FR-006**: This persistence MUST be entirely client-side (independent of any server/backend state) — the whole point is surviving conditions where the server itself is unavailable.

## Success Criteria *(mandatory)*

- **SC-001**: Zero not-yet-sorted files are lost across a page refresh, tab close/reopen, or a dev-server restart, in the same browser.
- **SC-002**: A person resuming a sorting session sees exactly the files they left in progress, no more, no fewer.

## Assumptions

- Cross-device or cross-browser persistence is explicitly out of scope — this is local-device storage, tied to the browser/device the files were originally added on.
