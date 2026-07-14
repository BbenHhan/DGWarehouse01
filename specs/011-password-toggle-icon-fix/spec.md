# Feature Specification: Password Toggle Icon Correction

**Feature Branch**: `011-password-toggle-icon-fix`

**Created**: 2026-07-10

**Status**: Draft

**Input**: User description: "The crossed-out eye icon on password fields should represent 'not showing' the password, not appear while it's currently visible — the current icon logic is backwards and confusing."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The icon matches what's actually happening on screen (Priority: P1)

Someone looking at a password field's reveal control can tell, from the icon alone, whether the password is currently masked or currently visible — without having to think about it or get it backwards.

**Why this priority**: This is the entire fix — Feature 010's control works correctly, but its icon currently communicates the opposite of what people expect, which defeats the purpose of having a visual indicator at all.

**Independent Test**: Look at a password field in its default (masked) state, confirm the crossed-eye icon is shown; reveal it, confirm the open-eye icon is shown instead.

**Acceptance Scenarios**:

1. **Given** a password field showing masked characters, **When** its reveal control is observed, **Then** the icon shown is the crossed-out eye, representing "not currently visible."
2. **Given** a password field showing the typed text in plain form, **When** its reveal control is observed, **Then** the icon shown is the open eye, representing "currently visible."
3. **Given** the field is toggled back and forth, **When** each icon is checked, **Then** it always matches the field's actual current display state, never the opposite.

---

### Edge Cases

- What happens to the button's accessible label (for screen readers) when the icon is corrected? It continues stating the action the button performs next, unchanged from Feature 010 — this fix is scoped to the icon only, not the label wording.
- What happens to fields that were already toggled to visible before this fix ships and are re-rendered? Not applicable — this is a static code correction, not a migration; every fresh render after the fix uses the corrected mapping.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When a password field is masked (the default, "not visible" state), the reveal control MUST display the crossed-eye icon.
- **FR-002**: When a password field is showing plain text (the "visible" state), the reveal control MUST display the open-eye icon.
- **FR-003**: This correction MUST apply everywhere the reveal control exists — the sign-in, sign-up, and password-reset fields — via the single shared component, not adjusted per field.
- **FR-004**: No other aspect of the reveal control — the toggle behavior, the accessible label wording, keyboard operability, or the submitted value — MUST change as part of this fix.

### Key Entities

- No new entities — a correction to existing UI state-to-icon mapping only.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the time a password field is masked, the crossed-eye icon is shown — never the open eye.
- **SC-002**: 100% of the time a password field is revealed, the open-eye icon is shown — never the crossed eye.
- **SC-003**: Zero regressions in toggle behavior, submitted values, or any other aspect of Feature 010 after this fix.

## Assumptions

- "Crossed-eye represents not-visible, open-eye represents visible" is the correct, standard convention per the user's explicit direction — this is not a judgment call this spec needs to make independently.
