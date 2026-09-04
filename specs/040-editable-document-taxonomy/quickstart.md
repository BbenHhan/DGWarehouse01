# Quickstart: Editable Document Taxonomy

**Feature**: [spec.md](spec.md) · **Date**: 2026-08-25

How to prove this feature works. Run every scenario before calling it done.

## Prerequisites

```bash
npm install
npm run dev
```

Sign in as an **editor** (not an admin — the point is that an editor can do all of this).
Have a second account at **viewer** to hand for Scenario 8.

Migration `0014` must be applied to whichever backend is active. For `supabase`, run it in
the SQL editor; for `local`, delete `.local-data/db.json` or let the store migrate it.

## Before you migrate: record the baseline

SC-008 says the documents visible today must still be visible afterwards, so capture what
"today" is first.

```bash
npm test
```

Then note, per category, how many documents there are and which groups they sit under.
Today's live figures are 33 documents across 4 categories and 7 groups — `structure` 5
groups, `electrical` 1, `environment` 1, `safety` 0. Write down what you actually see;
these numbers are the assertion for Scenario 1.

## Scenario 1 — Nothing was lost (FR-006, SC-008)

Apply the migration, reload `/documents`.

- Every category shows the same documents, under the same group names, as your baseline.
- Total document count is unchanged.
- Documents that had no group still show outside every group.
- `safety` still shows no groups — it had none to carry over.

If any count differs, stop. Nothing else in this list matters until this passes.

## Scenario 2 — A topic can exist before a file does (US1, SC-001)

Open `หมวดที่ 4 ความปลอดภัย`, which has no documents.

- Switch on management mode, add `4.1 ป้ายสัญลักษณ์ความปลอดภัย`.
- It appears immediately, showing zero files.
- Leave management mode. Open the upload form: the group picker offers it.
- Upload a file into it. It appears under that group and the count becomes 1.

This is the scenario that was impossible before the feature.

## Scenario 3 — The picker shows the right groups, and only those (FR-023, SC-004)

On `หมวดที่ 1`, open the upload form's group picker.

- All five of that category's groups are offered, including any holding no files.
- None of `หมวดที่ 2`/`3`/`4`'s groups appear.

## Scenario 4 — Renaming touches no file (US2, SC-002)

Rename a group that holds several documents.

- The new name shows at once, everywhere the old one appeared.
- Every document is still under it; none moved or vanished.
- Rename a category: its name changes, and its URL does not — the old
  `/documents/<slug>` link still works (FR-013).
- Try renaming a group to a name another group in the same category already uses: refused,
  with a reason, original name kept.
- Clear a name and click away: the previous name is kept, not a blank one.

## Scenario 5 — Order holds for everyone (US3, SC-003)

Move a group from last to first; move a category up.

- Tap "up" four times quickly on one row: the order that settles matches what is on
  screen, not an intermediate state.
- No "up" on the first row, no "down" on the last.
- Reload in another browser signed in as someone else: same order.

## Scenario 6 — Moving a document anywhere (US6, FR-026)

- Move a document from one category's group into a *different* category's group.
- It leaves the first and appears under the second; both counts update.
- Offer a destination of "no sub-group": the document lands outside every group.
- A group created a moment ago is selectable as a destination without a reload.
- Open the file after the move: it still downloads (storage was not re-keyed —
  research Decision 5).

## Scenario 7 — Deleting, both ways (US5, FR-011, FR-011a, FR-011b, SC-005)

**Empty group**: delete it. One confirmation, then gone — from the list and from the
upload picker.

**Category with sub-groups but no files**: delete it. Its groups go with it in one action;
you are not made to delete them one at a time (FR-010).

**Group holding files, choosing move**: delete it. You are asked to choose. Choose move,
pick a destination, confirm.

- Every document is at the destination; the count there rose by exactly that many.
- Nothing was deleted.

**Group holding files, choosing delete**: delete it. Choose delete.

- A second confirmation appears and names the number of files.
- Dismiss it: nothing is deleted, nothing moved (FR-011b). Verify the count is unchanged.
- Confirm it: the group and its files are gone, and the stored objects are gone too — not
  left orphaned in Storage.

**The destination is inside what you are deleting**: it is not offered at all.

## Scenario 8 — A viewer cannot do any of it (FR-016, SC-006)

Sign in as a viewer.

- The document list looks exactly as it did before this feature. No management control is
  visible anywhere.
- The list itself still reads correctly — groups, order, counts.

Then, still as the viewer, invoke a taxonomy action directly rather than through the UI.
It must be refused by the server, not merely hidden (spec Edge Cases). Hiding a button is
not the check.

## Scenario 9 — Typing survives a mis-click (FR-025)

Type a group name into an add field. Without submitting, leave management mode and come
back.

- What you typed is still there.

## Scenario 10 — Mobile (Constitution IV)

At 375px wide, in management mode:

- Every row's controls are reachable and tappable.
- A very long group name does not break the row or push the page sideways.
- No horizontal scrolling anywhere.

## Scenario 11 — Failure is visible (Constitution V, FR-022)

Kill the dev server mid-edit, or block the request, then rename something.

- The change is reported as failed, not left showing on screen as though it saved.
- The list returns to the true saved state.

## Automated coverage

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Unit and integration tests run against the `local` backend, as the checklist's do. What
they should cover — the disposition rules, sort-order renumbering, uniqueness, and the
migration's backfill — is `/speckit-tasks`' job to enumerate.
