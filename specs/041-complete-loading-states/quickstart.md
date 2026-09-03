# Quickstart: Complete Loading States

## Prerequisites

- Dev server running (`npm run dev`, or the `dev` preview configuration)
- Signed in as an **editor** for Scenarios 1–4, and as an **admin** for Scenario 5
- Browser DevTools open, Network tab, throttling set to **Slow 4G** — most of these waits
  are invisible on a fast local connection, which is why they were missed until now

## Automated checks

```bash
npx vitest run
```

```bash
npx tsc --noEmit && npm run lint
```

## Scenario 1 — A control that writes says it is working (FR-001, FR-002, US1)

1. Open a checklist screen and change one item's status
2. The control's chevron becomes a spinner within a moment, and the control cannot be
   changed again until it settles
3. **Expected**: no other row on the screen shows any sign of being busy (FR-004)

## Scenario 2 — A quick action stays still (FR-013, SC-008)

1. Turn throttling **off**
2. Change a checklist status
3. **Expected**: no spinner flashes — the row is visually still

## Scenario 3 — A failed write recovers (FR-003, SC-004)

1. In DevTools, block the request the status change makes (Network → block request URL),
   or switch to Offline
2. Change a status
3. **Expected**: the indicator clears, a Thai error appears, and the control shows the
   value it had before — not the one you picked

## Scenario 4 — A document reports how much has arrived (FR-014, SC-009)

1. With throttling on, open the preview of a document of 5 MB or more
2. **Expected**: the preview area shows a share of the whole and the size arriving, both
   climbing; when it completes the file is shown and nothing of the indicator remains
3. Open a preview of a file type the browser will not display inline
4. **Expected**: the existing download fallback appears and no indicator is left spinning

## Scenario 5 — Admin controls (FR-001, FR-004)

1. As an admin, open user management and change one person's role
2. **Expected**: that row's control shows it is saving; no other row does
3. Approve a pending access request
4. **Expected**: both that row's buttons show the row is busy, and other rows are unaffected

## Scenario 6 — Signing in (FR-005, FR-012b, US2)

1. Sign out, then sign in with throttling on
2. **Expected**: the button says in Thai that it is checking, and **stays** that way until
   the next screen is on screen — there is no moment where it looks clickable again while
   the old screen is still showing
3. Sign in again with a wrong password
4. **Expected**: the button returns to normal and the reason is shown in Thai

## Scenario 7 — Video keeps its behaviour (FR-014d, SC-011)

1. Open a video preview with throttling on
2. **Expected**: progress is reported, **and** the video can be played before it has fully
   arrived, and can be scrubbed forward — if either is lost, FR-014d has been broken

## Scenario 8 — Images (FR-006, FR-008)

1. Open a photo-heavy screen with throttling on
2. **Expected**: each tile shows a placeholder, never a blank box, and each is replaced by
   its photo as it arrives
3. Block one image's request
4. **Expected**: that tile says in Thai it could not be loaded, rather than showing a
   placeholder forever

## Scenario 9 — Mobile (FR-011, SC-005)

1. Set the viewport to **375 px** and repeat Scenarios 1 and 5
2. **Expected**: no horizontal scrolling appears, no control's label is truncated by the
   indicator, and no row changes size when its indicator appears

## Scenario 10 — Screen reader (FR-010, SC-006)

1. With VoiceOver on, trigger a write and open a document preview
2. **Expected**: each wait is announced; the indicator is not silent decoration

## Coverage check (SC-001)

Walk the list in the spec's Assumptions — the checklist controls, room checklist controls,
account menu, user role table, pending access requests, photo grid, the three login-screen
forms, the document preview, and the image thumbnails in the upload workspace, unsorted
file tray, and mobile swipe card. Every one must show something while it waits.
