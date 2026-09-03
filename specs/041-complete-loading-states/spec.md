# Feature Specification: Complete Loading States

**Feature Branch**: `041-complete-loading-states`

**Created**: 2026-09-03

**Status**: Draft

**Input**: User description: "แสดงสถานะกำลังโหลดให้ครบทุกจุดที่ผู้ใช้ต้องรอ — ทุกปุ่มและทุกการกระทำที่ยิงไปหาเซิร์ฟเวอร์ (เปลี่ยนสถานะเช็คลิสต์ เพิ่ม/ลบรายการเช็คลิสต์ ออกจากระบบ ขอสิทธิ์แก้ไข เปลี่ยน role ผู้ใช้ อนุมัติ/ปฏิเสธคำขอ ลบรูป) ฟอร์มเข้าสู่ระบบ/สมัคร/รีเซ็ตรหัสผ่าน การพรีวิวไฟล์ PDF ที่ไฟล์ใหญ่ 5-30MB และรูปภาพทุกจุดที่ยังขึ้นว่างเปล่าระหว่างโหลด ต้องดูดี ใช้ primitive Spinner/Skeleton ที่มีอยู่แล้ว และเป็นภาษาไทย mobile-first ตาม Constitution IV กับ V"

## Clarifications

### Session 2026-09-03

- Q: Where does the busy indicator go on a dropdown control (checklist status, user role)? → A: It replaces the dropdown's own chevron, so the row does not change size
- Q: After sign-in succeeds there is still a navigation before the next screen appears — does the button stay busy? → A: Yes, until the new screen is on screen
- Q: Which previewed files report how much has arrived? → A: All of them — documents, images, and video
- Q: Images cannot report progress without giving up being sized to the screen — which wins? → A: Sizing wins; images show a loading placeholder instead of a share
- Q: How quickly should a busy indicator appear? → A: After about 150 ms, so quick actions stay still (asked during /speckit-specify)
- Q: Should a large document preview report progress or only that it is loading? → A: Report progress (asked during /speckit-specify)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every button says when it is working (Priority: P1)

A warehouse user taps a control that changes saved data — a checklist item's
status, adding or removing a checklist entry, deleting a photo, changing
someone's role, approving or denying an access request, requesting edit
rights, or signing out. Today several of these do nothing visible until the
write comes back: the control merely stops responding. On a warehouse phone on
mobile data that gap is long enough to read as a broken button, so the user
taps again.

**Why this priority**: These are the controls staff touch every day, and a
silent control invites repeat taps on writes that change real records. This is
also the direct obligation of Constitution V, which the current code does not
meet in these places.

**Independent Test**: Throttle the connection, tap each listed control once,
and confirm a visible busy state appears within the same moment as the tap and
clears when the write settles — without touching sign-in or file previews.

**Acceptance Scenarios**:

1. **Given** a checklist item on screen, **When** the user changes its status, **Then** that row shows it is saving until the change is stored, and the control cannot be triggered again meanwhile
2. **Given** a slow connection, **When** the user taps a control that writes, **Then** a busy indicator appears on the control the user actually touched, not only elsewhere on the page
3. **Given** a write that fails, **When** the failure comes back, **Then** the busy state clears, the error is stated in Thai, and the view returns to the last truly saved state — never left spinning
4. **Given** an admin approving an access request, **When** the request is being resolved, **Then** both the approve and the deny control for that row show the row is busy, not just the one that was pressed

---

### User Story 2 - Signing in shows it is checking (Priority: P2)

Someone signs in, creates an account, or asks for a password reset. The submit
button currently greys out with no other change, so on a slow connection the
screen looks frozen at exactly the moment a new user has least confidence that
the app works.

**Why this priority**: It is the first screen every user meets and the first
impression of whether the app is working, but it affects one action per
session rather than the repeated daily actions in Story 1.

**Independent Test**: Submit each of the three forms on a throttled connection
and confirm each states in Thai that it is working, without needing any other
part of the feature.

**Acceptance Scenarios**:

1. **Given** the sign-in form, **When** credentials are submitted, **Then** the button shows it is checking and cannot be submitted twice
2. **Given** a rejected sign-in, **When** the error returns, **Then** the busy state clears and the reason is shown in Thai
3. **Given** the sign-up or password-reset form, **When** it is submitted, **Then** it behaves the same way as sign-in

---

### User Story 3 - Files and images show they are arriving (Priority: P3)

A user opens a document's preview. The stored documents run from about 5 MB to
30 MB, so on a phone the preview area can stay blank for many seconds with
nothing to say a download is under way. The same blankness appears wherever a
photo or a file thumbnail is still loading.

**Why this priority**: It is the longest wait in the app and the one most
likely to be mistaken for a broken file, but it is a read rather than a write,
so nothing is lost or repeated if the user gives up and retries.

**Independent Test**: Open a large document preview and a photo-heavy screen
on a throttled connection and confirm neither ever shows an unexplained blank
rectangle.

**Acceptance Scenarios**:

1. **Given** a document preview is opened, **When** the file is still arriving, **Then** the preview area shows it is loading rather than empty space
2. **Given** the file finishes arriving, **When** it renders, **Then** the loading indicator is replaced by the file with no leftover placeholder
3. **Given** an image that fails to load, **When** the failure is known, **Then** the space says so instead of showing a permanent placeholder
4. **Given** a browser that refuses to display a file inline, **When** the preview is opened, **Then** the existing download fallback is shown and the loading indicator does not remain

---

### Edge Cases

- A write that finishes almost instantly must not produce a visible flash of a busy indicator that reads as a glitch
- A user taps the same control repeatedly while it is busy: the extra taps must not queue extra writes
- A write that never returns must not leave the control busy forever with no way out
- A list item is removed while its own row is busy: the busy state must disappear with the row, not outlive it
- Two rows in the same list are busy at once: each must show its own state, never one row's activity on another's control
- Deletes already remove the item immediately (Constitution V): they must not gain a spinner that contradicts the item having visibly gone
- A document that is not an image, video, or file the browser can display inline must not sit on a loading indicator that never resolves
- On a 375 px screen, adding a busy indicator to a control must not push the row into horizontal scrolling or hide its label

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every control that sends a change to the server MUST show an explicit busy state on the control the user activated, for the whole time the change is in flight
- **FR-002**: A control that is busy MUST refuse further activation until it settles, so one tap cannot become several writes
- **FR-003**: When a change fails, the busy state MUST clear, the reason MUST be stated in Thai, and the view MUST return to the last saved state
- **FR-004**: Busy states MUST be scoped to the item being changed, so that one row in a list never appears busy because a different row is
- **FR-005**: The sign-in, sign-up, and password-reset forms MUST each show, in Thai, that a submission is being processed
- **FR-006**: An area waiting for a file, image, or preview to arrive MUST show that it is loading rather than blank space
- **FR-007**: A loading indicator MUST be replaced by the real content once it arrives, and MUST NOT remain once the wait is over — including when the wait ends in a failure or a fallback
- **FR-008**: An image or file that cannot be displayed MUST say so in Thai rather than leaving a placeholder in place indefinitely
- **FR-009**: Deletes MUST keep their existing immediate-removal behaviour and MUST NOT be given a busy indicator that outlives the item
- **FR-010**: Every loading and busy state MUST be announced to assistive technology, so a screen-reader user learns of the wait rather than meeting silence
- **FR-011**: Every loading and busy state MUST fit the existing 375 px mobile layout without introducing horizontal scrolling or truncating the control's label
- **FR-012**: All loading and busy states MUST reuse the app's existing loading visual language rather than introducing new one-off indicators
- **FR-012a**: On a control that opens a list of choices, the busy indicator MUST take the
  place of that control's own dropdown marker, so the control keeps its size and the row
  does not reflow — a hard requirement at 375 px (FR-011)
- **FR-012b**: A submission that ends by moving the user to another screen MUST stay busy
  until that screen is shown, so no untouched-looking gap appears between the response
  arriving and the screen changing
- **FR-013**: A control MUST become unavailable to further activation the instant it is
  activated, but its busy indicator MUST NOT appear until the wait has lasted about
  150 ms, so an action that completes quickly stays visually still instead of flashing
- **FR-013a**: Once a busy indicator has appeared, it MUST stay visible long enough to be
  read rather than vanishing in the same instant it arrives
- **FR-014**: While a document preview is arriving, the user MUST be told how much of it
  has arrived, as a share of the whole and in the file's own size units, so a long wait
  is distinguishable from a stalled one
- **FR-014a**: When the total size cannot be known in advance, the preview MUST still
  report that it is loading and how much has arrived so far, rather than showing nothing
- **FR-014b**: Reporting progress MUST NOT cost the user a second download of the file,
  and MUST NOT remove the existing fallback for a browser that will not display the file
  inline
- **FR-014c**: A previewed document or video MUST report how much of it has arrived. An
  image MUST show that it is loading, but is exempt from reporting a share: the only way
  to measure an image's arrival is to stop having it delivered at a size suited to the
  screen, and FR-014d values the smaller download on a phone more highly
- **FR-014d**: Reporting progress MUST NOT take away a capability the preview has today:
  a video MUST still start before it has fully arrived and MUST still be seekable, and an
  image MUST still be served at a size suited to the screen

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every control in the app that waits on the server shows a visible busy state — zero silent waits remain, verified by walking the full list of such controls
- **SC-002**: On a connection throttled to a slow mobile speed, no screen area is ever blank for more than one second without explaining that something is loading
- **SC-003**: A user on a slow connection can tell, without waiting for the result, whether their tap registered — measured by no repeat taps in a walkthrough of each control
- **SC-008**: An action that settles quickly produces no visible flash of a busy indicator
- **SC-009**: A user watching a large document load can tell within a few seconds whether it is progressing or stalled
- **SC-010**: Adding a busy indicator to a control changes neither its size nor its row's layout, at 375 px and above
- **SC-011**: A video preview still plays before it has fully downloaded and can still be scrubbed
- **SC-004**: No busy state persists after its action has settled, in success, failure, and fallback, across every control covered
- **SC-005**: Every busy and loading state is reachable and legible at 375 px with no horizontal scrolling
- **SC-006**: Every busy and loading state is announced to a screen reader
- **SC-007**: All added wording is in Thai

## Assumptions

- The existing loading visual language introduced in the previous change — the spinner and skeleton building blocks and the page-level loading screens — is the intended vocabulary, and this feature extends its coverage rather than redesigning it
- "Everything that waits" means waits the user can perceive: actions sent to the server, page navigations, and content downloaded for display. Purely local, instantaneous work such as filtering an already-loaded list is out of scope
- Deletes keep the optimistic behaviour Constitution V requires; this feature does not revisit that decision
- The page-level loading screens and the document-taxonomy controls already covered by the previous change are out of scope except where this feature's checks reveal a gap in them
- No new dependency is needed; the work is applying the existing building blocks to the places that lack them
- The 150 ms delay before an indicator appears, the progress reporting for previews, and
  its extension to every previewed file type were decided by the account holder rather
  than assumed
- Progress for video is read from how much the player has buffered rather than by
  downloading the file before playing it. Buffering the whole video first would satisfy
  "report progress" while taking away instant playback and seeking, which FR-014d forbids
- The set of places needing work is the audit of the current code: the checklist controls, the room checklist controls, the account menu, the user role table, the pending access requests, the photo grid, the three login-screen forms, the document preview, and the image thumbnails in the upload workspace, the unsorted file tray, and the mobile swipe card
