# Phase 0 Research: Complete Loading States

## 1. Delaying a busy indicator without losing it (FR-013, FR-013a)

**Decision**: One shared hook that takes the raw in-flight boolean and returns a
"should show" boolean. It turns true only after the wait has lasted ~150 ms, and once
true it stays true for a floor of ~400 ms even if the work finishes sooner.

**Rationale**: FR-013 and FR-013a pull in opposite directions — one asks the indicator
to hold back, the other asks it not to blink out the moment it arrives. A delay alone
gives a 10 ms flash for any action that lands at 160 ms; a floor alone reintroduces the
flash the delay was meant to remove. Both timers in one hook is the only place they can
be reconciled, and it keeps every call site down to a single boolean.

**Alternatives considered**: CSS `animation-delay` on the spinner — rejected, it hides
the indicator but not the layout space it occupies, so the row still moves at 0 ms.
Per-component `setTimeout` — rejected, it is the same logic written eleven times, and
FR-004 needs it right in every one.

## 2. Where the indicator goes on a Select (FR-012a)

**Decision**: A `busy` prop on the shared `SelectTrigger`, which swaps its own
`ChevronDownIcon` for the spinner. Call sites pass `busy` next to the `disabled` they
already pass.

**Rationale**: The trigger already renders that icon in a fixed-size slot, so replacing
its contents changes nothing about the row's geometry — which is what FR-012a and
SC-010 require, and what a phone at 375 px is least forgiving about. Doing it once in
`components/ui/select.tsx` also means the checklist status control and the role control
cannot drift apart.

**Alternatives considered**: A spinner appended beside each Select — rejected, it widens
the row on the narrowest screen. Dimming the whole row — rejected, it cannot say *which*
control is working when a row has several.

## 3. Per-row scoping (FR-004)

**Decision**: Components that act on rows track the id of the row being written, not a
bare boolean. `UserRoleTable` and `PendingRequestsList` already do this; `RoomChecklistBox`
and `ChecklistList` share one `useTransition` across every row and must change.

**Rationale**: A shared transition marks every row busy when one is written, so a list of
twenty checklist rows all spin because one status changed. That is worse than no
indicator: it says something is happening to rows that nothing is happening to.

**Alternatives considered**: A `Set` of in-flight ids — deferred; these lists write one
row at a time because each control disables itself on activation (FR-002), so a single id
is sufficient and simpler to reason about. Recorded here so a future concurrent case has
a documented starting point.

## 4. Progress for a document preview (FR-014, FR-014b)

**Decision**: Fetch the file with `fetch`, read the response body as a stream, count bytes
against `Content-Length`, and hand the finished bytes to the existing `<object>` as a blob
URL. Revoke the URL when the preview closes.

**Rationale**: This is the only route that yields a real share for a PDF, and it downloads
the file exactly once — the same bytes that get displayed, satisfying FR-014b. The
`<object>` and its download fallback are untouched, so a browser that refuses to render
PDFs inline behaves exactly as it does today (FR-014b, Story 3 scenario 4).

**Alternatives considered**: Letting the `<object>` load the URL directly and showing an
indeterminate indicator — rejected, it cannot distinguish a slow 30 MB download from a
stalled one, which is SC-009. A HEAD request for the size followed by a normal load —
rejected, two requests and still no progress between them.

**Risks**: If `Content-Length` is absent (a compressed or chunked response), the share is
unknowable. FR-014a already covers this: report bytes received without a percentage. If
`fetch` itself fails, fall back to pointing the `<object>` at the direct URL, so a preview
never becomes *less* capable than it is today.

## 5. Progress for a video (FR-014c, FR-014d, SC-011)

**Decision**: Leave the `<video>` element pointed at the direct URL and read progress from
its own `buffered` time ranges via the `progress` event.

**Rationale**: The buffered ranges are the browser's own account of what has arrived, so
progress costs nothing extra and the player keeps range requests — which is what lets a
video start before it is complete and be scrubbed (FR-014d, SC-011). Downloading a video
through `fetch` first would report a tidy percentage and take both of those away.

**Alternatives considered**: The same stream-and-blob approach as PDFs — rejected on
FR-014d.

## 6. Images (FR-014c exemption, FR-006)

**Decision**: Keep `next/image`. Show a skeleton in the image's own box until its `load`
event fires, and an explicit Thai message if `error` fires instead (FR-008).

**Rationale**: Measuring an image's arrival means fetching it directly, which gives up the
screen-appropriate size `next/image` serves — a materially bigger download on the phones
this app is used on. The account holder chose the smaller download over the percentage.

**Alternatives considered**: Fetching the `/_next/image` optimizer URL by hand to get both
— rejected, it reimplements `next/image`'s size negotiation and breaks the moment that
URL shape changes.

## 7. Staying busy through a navigation (FR-012b)

**Decision**: The sign-in and sign-up submit handlers do not clear their loading state on
success — only on failure. The state dies with the component when the next screen renders.

**Rationale**: Sign-in ends in a redirect, so clearing on success reopens the button for
the whole span between the response and the new screen — precisely the gap where a user
concludes nothing happened and clicks again.

**Alternatives considered**: A separate "redirecting" state — rejected, it is a second
state that looks identical to the user and adds a way to get it wrong. Password reset
does *not* navigate, so it keeps clearing on success and shows its result in place.

## 8. Announcing waits (FR-010)

**Decision**: Reuse the existing `LoadingRegion` wrapper for areas that fill in, and give
in-place indicators an `aria-live="polite"` status with Thai text. Spinner glyphs stay
`aria-hidden`, since the text beside them is what carries the meaning.

**Rationale**: The building blocks committed with the page-level loading screens already
establish this pattern; extending it keeps one announcement style across the app rather
than each component inventing its own.
