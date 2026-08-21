# Feature Specification: Recurring Time-Period Generator for Week Selection

**Feature Branch**: `016-recurring-period-generator`

**Created**: 2026-07-17

**Status**: Draft

**Input**: User description: "Replace free-text start/end date entry for creating a week with a picker over a list of non-overlapping periods generated from a configurable repeating cadence, so accidental overlapping/duplicate date ranges become structurally rare instead of a routine typing mistake."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Picking a date range becomes choosing from a list, not typing two exact dates (Priority: P1)

Today, creating a week (on the bulk-upload page or the normal room/work-type page's "+ สัปดาห์ใหม่" control) means typing an exact start date and end date by hand. It's easy to mistype or misremember an existing range, and the resulting rejection ("this date range already exists") doesn't say what it actually conflicts with — confusing and easy to repeat. Instead, once a recurring cadence is set up, anyone creating a week picks from a list of already-computed, non-overlapping periods.

**Why this priority**: This is the entire point of the feature — without it, the account holder is back to free-text entry and the exact confusion this feature exists to prevent.

**Independent Test**: With a cadence configured, open the week-date picker (either entry point) and confirm it shows a list of computed periods (not two free-text date fields) that can be picked directly.

**Acceptance Scenarios**:

1. **Given** a sitewide cadence has been configured (an interval and a starting point), **When** someone opens the date picker to create a week — on the bulk-upload page or the normal room/work-type page's add-week control — **Then** they see a list of computed periods to choose from, not two blank date fields to type into.
2. **Given** the list of computed periods, **When** someone looks at the most recent entry, **Then** it includes the period that contains today, even though that period may extend past today into the future (it's still in progress, and still needs to be a usable choice).
3. **Given** someone picks a period from the list and there is no existing week with that exact range for the room + work type they're adding to, **When** they confirm, **Then** a new week is created with that period's dates, the same as typing those exact dates would have done today.
4. **Given** someone picks a period that already has a week for that room + work type, **When** they confirm, **Then** they're taken to that existing week rather than told it "already exists" as if it were an error — reusing on exact match is expected, ordinary behavior, not a failure.

---

### User Story 2 - The account holder sets the cadence themselves, easily (Priority: P1)

The account holder — not a developer, not this feature's designer — decides how often site visits actually get documented (e.g. every 7 days, every 10 days, every month) and when that counting starts. They need to set this up themselves, without it feeling technical.

**Why this priority**: Equal priority to User Story 1 — a hardcoded cadence would fit today's guess and inevitably stop matching reality; the account holder explicitly asked to control this themselves.

**Independent Test**: As an admin, open the cadence configuration, set an interval and starting point, save, and confirm the generated period list (User Story 1) immediately reflects the new setting.

**Acceptance Scenarios**:

1. **Given** an admin account, **When** they open the sitewide cadence configuration, **Then** they can set how often periods repeat (a number and a unit — days, months, or years) and the date periods start counting from, using plain, non-technical controls.
2. **Given** a saved cadence, **When** the admin changes the interval or starting point and saves again, **Then** every place that shows the generated period list (both entry points from User Story 1) reflects the updated cadence the next time it's opened.
3. **Given** an account that is not an admin, **When** they reach the cadence configuration (directly or otherwise), **Then** they cannot view or change it — same protection level as other sitewide configuration on this site.

---

### User Story 3 - A work type that runs on a different rhythm can have its own cadence (Priority: P2)

Most work types share the same documentation rhythm, but the account holder anticipates that a specific work type might genuinely need a different one (e.g. inspected less often than the rest). Rather than forcing everything onto one cadence, a specific work type can be set to follow its own.

**Why this priority**: Real but secondary — the sitewide default (User Stories 1-2) covers the common case on its own; this is a refinement for the exception, not something every account holder will need on day one.

**Independent Test**: Set a distinct cadence for one specific work type, then confirm the period list shown for that work type (in any room) reflects its own cadence while every other work type still shows the sitewide default.

**Acceptance Scenarios**:

1. **Given** the sitewide cadence is already configured, **When** an admin sets a different cadence specifically for one work type, **Then** the period list shown when creating a week for that work type (in any room) reflects its own cadence, not the sitewide one.
2. **Given** a work type with its own cadence, **When** someone creates a week for a *different* work type, **Then** they still see the sitewide default — one work type's override never affects another's.
3. **Given** a work type currently has its own override, **When** an admin removes the override, **Then** that work type goes back to following the sitewide default.

---

### User Story 4 - A genuine collision still shows a specific, understandable reason (Priority: P2)

Generated periods make accidental collisions rare, but a generated period can still, in principle, land on top of one of the historical weeks already on the site (which don't follow any generated cadence). When that happens, the rejection needs to say what it actually conflicts with.

**Why this priority**: Closes the loop on the actual complaint that prompted this feature — a real but rarer case now that periods are generated, so it's a P2 refinement of the error path rather than the main flow.

**Independent Test**: Deliberately pick a generated period that overlaps an existing week, attempt to create it, and confirm the rejection names the conflicting week's actual date range.

**Acceptance Scenarios**:

1. **Given** a generated period overlaps an existing week (for the same room + work type) that isn't an exact match, **When** someone attempts to create it, **Then** they're told clearly which existing week (by its actual date range) it conflicts with — not a generic "already exists" message.

---

### Edge Cases

- The 121 weeks already on the site (from an earlier bulk import, with irregular, non-cadence-following date spans) are never touched, renumbered, or reinterpreted by this feature — the generator only produces new candidate periods going forward from whichever starting point the account holder sets; it does not try to retroactively explain or align historical data.
- No cadence has been configured yet: the date picker falls back to today's free-text entry behavior rather than presenting an empty or broken list, so week creation is never blocked by this feature not being set up yet.
- An interval measured in months or years, applied to a starting date near the end of a month (e.g. the 31st): each generated period's boundary lands on a real calendar date even in shorter months, using the same reasonable convention consistently rather than producing invalid dates.
- The generated list must have a defined upper bound (through the current in-progress period) so it doesn't attempt to render an unbounded number of future periods.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST let an admin configure a sitewide recurring cadence: a repeat interval (a number and a unit of days, months, or years) and a starting point that periods are counted from.
- **FR-002**: Given a configured cadence, the system MUST generate the sequence of non-overlapping periods it implies, starting from the configured starting point, up through and including whichever period contains the current date.
- **FR-003**: The system MUST present the generated period list, not free-text date entry, at both existing points where a week's date range is chosen: the bulk-upload page and the normal room/work-type page's add-week control.
- **FR-004**: The system MUST let an admin configure a distinct cadence for an individual work type that overrides the sitewide default for every room under that work type, and MUST let that override later be removed (reverting to the sitewide default).
- **FR-005**: When someone picks a generated period that exactly matches an existing week for the room + work type they're working in, the system MUST treat this as selecting that existing week, not as an error.
- **FR-006**: When someone picks a generated period that overlaps a different, non-identical existing week for the room + work type they're working in, the system MUST reject it and state which existing week (its actual date range) it conflicts with.
- **FR-007**: The system MUST NOT modify, renumber, or otherwise alter any week created before this feature's cadence was configured.
- **FR-008**: The system MUST restrict configuring the sitewide cadence and any work-type override to admin accounts; creating a week by picking from the generated list MUST remain available to the same accounts who can create one today (editor and admin).
- **FR-009**: If no cadence has been configured yet, the system MUST fall back to today's free-text date entry for creating a week, rather than presenting a broken or empty picker.

### Key Entities

- **Cadence**: A repeat interval (number + unit: day, month, or year) and a starting date that a sequence of periods is generated from. Exactly one sitewide cadence may exist; a work type may optionally have its own cadence that overrides the sitewide one for that work type only.
- **Generated period**: A computed, non-overlapping date range implied by a cadence (start date, end date) — not stored as its own record; recomputed from the cadence whenever the picker is shown, up through the period containing today.
- **Week** *(existing entity, reused not redefined)*: Unchanged — still a (room, work type, date range) grouping. This feature only changes how its date range gets chosen at creation time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After a cadence is configured, creating a week no longer requires typing any date by hand — every date-range choice is a selection from a presented list.
- **SC-002**: An admin can set up or change the sitewide cadence in under a minute, using only a number, a unit, and a starting date — no technical knowledge required.
- **SC-003**: Accidental duplicate/overlapping date ranges caused by mistyped dates drop to effectively zero once a cadence is configured, since there is no longer a free-text field to mistype into.
- **SC-004**: When a genuine collision does still occur, the person sees the specific conflicting week's date range in the message, not a generic rejection.
- **SC-005**: None of the 121 pre-existing historical weeks change in any way as a result of configuring or using this feature.

## Assumptions

- The work-type override (User Story 3) is scoped to a work type across all rooms, not to an individual room or a specific room+work-type pair — the account holder's own phrase ("หมวดนี้") most naturally maps to this app's existing "หมวดงาน" (work type) vocabulary. Flagged for the account holder to correct if this guess is wrong.
- "Admin" for configuring the cadence follows this site's existing three-role model (viewer/editor/admin) — the same level already required for other sitewide configuration (e.g. user role management), not a new permission tier.
- A month/year-based interval that would land on a day that doesn't exist in the target month (e.g. starting the 31st, stepping by months) resolves using a single, consistently-applied convention (e.g. clamping to the last real day of that month) — the exact convention is a planning-phase detail, not a product decision requiring its own requirement, as long as it's applied the same way every time.
- The generated list is bounded at "the period containing today" — periods that would start after today are not generated or shown, since they don't correspond to a usable choice yet.
- This feature governs *when a week is created*; it does not change anything about how photos are uploaded, assigned, or displayed once a week exists (specs/015 remains the mechanism for that).
