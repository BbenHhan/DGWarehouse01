# Feature Specification: Automate the Checks Nobody Can Run

**Feature Branch**: `045-automate-manual-checks`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "มี manual test 17 ข้อค้างอยู่ใน feature 040-044 ที่ต้องล็อกอินเป็น editor ถึงจะทดสอบได้ ทำให้ไม่มีใครรันจริงสักที ต้องการเปลี่ยนสิ่งที่ทดสอบอัตโนมัติได้ให้เป็นเทสอัตโนมัติ โดยเฉพาะเรื่องความปลอดภัย (viewer ต้องโดนเซิร์ฟเวอร์ปฏิเสธจริงไม่ใช่แค่ซ่อนปุ่ม) การลบที่มีไฟล์อยู่ข้างใน การเขียนที่ล้มเหลวต้องบอกเหตุผล ข้อความที่พิมพ์ค้างไว้ต้องไม่หาย การกดเรียงลำดับรัวๆ ต้องได้ผลตรงกับที่เห็นบนจอ และวิดีโอต้องเล่นได้ก่อนโหลดครบ ส่วนข้อที่ทดสอบอัตโนมัติไม่ได้จริงๆ ให้ระบุไว้ชัดว่าทำไม"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The security boundary is proved, not assumed (Priority: P1)

Five features have shipped whose management controls are hidden from a viewer. Whether the
server would actually refuse those actions if someone invoked them directly has never been
checked — the only check written for it needs a signed-in session that nobody has run.
"The button is hidden" and "the action is refused" are different claims, and only the
second one is a security property.

**Why this priority**: It is the only outstanding check whose failure would be a security
hole rather than a cosmetic defect, and it is fully checkable without a browser.

**Independent Test**: Invoke every management action as someone without edit rights and
confirm each is refused and changes nothing.

**Acceptance Scenarios**:

1. **Given** someone without edit rights, **When** any management action is invoked directly, **Then** it is refused with a stated reason
2. **Given** nobody is signed in, **When** any management action is invoked, **Then** it is refused, and distinguishably so — being unknown is not the same as being disallowed
3. **Given** a refused action, **When** the refusal returns, **Then** nothing has been created, renamed, moved, or deleted
4. **Given** the rule that an administrator's only extra power is managing roles, **When** the management actions check rights, **Then** they require edit rights rather than administrator rights

---

### User Story 2 - Destroying files stays a decision (Priority: P1)

Deleting a category or sub-group that still holds documents is the one action in the app
that can destroy the account holder's records. Its guards — that an empty-claim is verified,
that the number agreed to is the number destroyed, that a destination inside the thing being
deleted is refused — exist in code and have never been executed by a test.

**Why this priority**: Equal to Story 1. A fault here loses documents permanently, and the
guards are precisely the kind of code that looks correct and is never exercised.

**Independent Test**: Drive each disposition — claim-empty, move, destroy — against a
target that really holds files, and check what survives.

**Acceptance Scenarios**:

1. **Given** a target that still holds documents, **When** deletion claims it is empty, **Then** it is refused and the count is stated
2. **Given** a destructive deletion, **When** the number of files no longer matches what was agreed to, **Then** it is refused rather than destroying more than was agreed
3. **Given** a move disposition, **When** the destination lies inside what is being deleted, **Then** it is refused
4. **Given** a move disposition to a valid destination, **When** it completes, **Then** every document is at the destination and none was destroyed
5. **Given** a category with sub-groups, **When** it is deleted, **Then** its sub-groups go with it in one action

---

### User Story 3 - The interaction rules that were only ever described (Priority: P2)

Three behaviours were specified, built, and then left to a manual walkthrough: typing that
survives leaving management mode, a burst of reorder taps settling in the order shown on
screen, and a video that plays before it has fully arrived. Each is a rule about what the
screen does over time, and each is checkable without a signed-in session.

**Why this priority**: A fault in any of these is visible and annoying rather than
dangerous, and the underlying features work. But these are the ones most likely to break
silently in a later change, because nothing currently notices.

**Independent Test**: Exercise each behaviour and assert the outcome.

**Acceptance Scenarios**:

1. **Given** text typed but not submitted, **When** management mode is left and re-entered, **Then** the text is still there
2. **Given** several reorder requests raised in quick succession, **When** they settle, **Then** the resulting order matches the last one requested and each was applied in turn
3. **Given** a video that has partly arrived, **When** it is shown, **Then** how much has arrived is reported and playback is not withheld until it is complete

---

### User Story 4 - What cannot be automated says so (Priority: P3)

Some of the outstanding checks genuinely need a person: how a screen looks at a phone
width, what a screen reader announces, and whether a real file downloads from storage after
a move. Leaving them in a list that also contains checks nobody bothered to automate makes
the whole list easy to ignore.

**Why this priority**: It changes no behaviour. But an honest, short list of what a person
must still do is more likely to be done than a long list where the reason for each entry is
unstated.

**Independent Test**: Read the remaining manual list and confirm every entry states why a
person is required.

**Acceptance Scenarios**:

1. **Given** a check that remains manual, **When** it is read, **Then** it states what makes it unautomatable here
2. **Given** a check that has become automated, **When** the manual list is read, **Then** it no longer appears there

---

### Edge Cases

- A check that is automated must fail if the behaviour regresses — a test that passes against broken code is worse than no test, since it also removes the suspicion
- Automating a check must not require weakening the thing it checks, such as loosening a rights check to make it reachable
- The automated checks must not depend on the account holder's live data, which changes
- A behaviour depending on timing must not produce a check that fails intermittently, since a flaky check is eventually ignored and then deleted

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every management action MUST be shown to refuse someone without edit rights, and to change nothing when it does
- **FR-002**: Being unauthenticated MUST be distinguishable from being disallowed
- **FR-003**: The management actions MUST be shown to require edit rights, not administrator rights
- **FR-004**: Each guard on deleting something that holds documents MUST be exercised: the verified empty-claim, the agreed-count match, and the refusal of a destination inside the deleted target
- **FR-005**: A successful move-then-delete MUST be shown to relocate every document and destroy none
- **FR-006**: Deleting a category MUST be shown to take its sub-groups with it
- **FR-007**: A rejected write MUST be shown to return a stated reason and leave the stored state as it was
- **FR-008**: Unsubmitted typing MUST be shown to survive leaving and re-entering management mode
- **FR-009**: A burst of reorder requests MUST be shown to settle in the order requested, one after another rather than overlapping
- **FR-010**: A partly-arrived video MUST be shown to report its progress without withholding playback
- **FR-011**: Checks MUST NOT depend on the account holder's live data
- **FR-012**: Checks MUST NOT be sensitive to real elapsed time in a way that makes them intermittent
- **FR-013**: Every check that remains manual MUST state what makes a person necessary for it
- **FR-014**: A check that has been automated MUST be removed from the manual list rather than listed twice

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every management action has a check proving it is refused without edit rights — zero actions rely on the control being hidden
- **SC-002**: Every guard protecting documents from deletion is executed by a check
- **SC-003**: The list of checks needing a person is shorter than it was, and every remaining entry states why
- **SC-004**: The checks pass repeatedly without intermittent failures
- **SC-005**: Each new check fails when the behaviour it protects is reverted
- **SC-006**: The checks run without a signed-in session, a browser, or the account holder's live data

## Assumptions

- "Automatable here" means checkable with the project's existing test setup. Introducing a
  browser-driving test harness is a larger decision and is out of scope; it is what would be
  needed for the layout and screen-reader checks, and that is stated rather than assumed away
- The five features' behaviour is not changed by this work. Where a check disagrees with the
  code, the code is presumed right unless the check reveals a genuine defect, which would be
  reported rather than silently fixed
- Checks that need to reach the storage backend use the project's local backend, which
  already exists for exactly this purpose (Constitution III)
- The manual checks that remain are the account holder's to run; this feature reduces their
  number and explains each survivor, rather than eliminating them
