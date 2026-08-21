# Feature Specification: Google OAuth Account Picker

**Feature Branch**: `main`

**Created**: 2026-08-21

**Status**: Implemented

**Input**: "ทำไมกด log in with google แล้วมันไม่มีให้เลือก account มัน log in account เดิมที่ log in กับ browser เลย มันต้องไม่ควรเป็นแบบนั้นสิ" — clicking "เข้าสู่ระบบด้วย Google" silently signed in with whatever Google account was already active in the browser, with no chance to pick a different one.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Google sign-in always offers an account choice (Priority: P2)

**Why this priority**: A real usability gap (no way to switch accounts without manually signing out of Google first, outside the app) but not a blocker — sign-in itself still worked, just always with the same account.

**Independent Test**: With a Google account already signed into the browser, click "เข้าสู่ระบบด้วย Google"; confirm Google's account chooser screen appears before proceeding, rather than silently continuing with the already-active session.

**Acceptance Scenarios**:

1. **Given** a Google account already signed into the browser, **When** "เข้าสู่ระบบด้วย Google" is clicked, **Then** Google's account picker screen appears.
2. **Given** the account picker is showing, **When** a different account (or the same one) is picked, **Then** sign-in proceeds normally with that choice.

## Requirements *(mandatory)*

- **FR-001**: The Google sign-in flow MUST always present Google's account chooser, regardless of any existing Google session in the browser.

## Success Criteria *(mandatory)*

- **SC-001**: Every Google sign-in attempt shows the account picker, verified via the actual outgoing OAuth authorize request (not just code review), 100% of attempts.

## Assumptions

- No change to which accounts are allowed to sign in, or what happens after — this only affects whether the chooser screen is shown, not authorization logic.
