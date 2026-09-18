# Quickstart: Sub-group Requirement Checklist

## Prerequisites

- Dev server on http://localhost:3000.
- For Scenarios 1–3 on real data: migration `supabase/migrations/0015_group_requirements.sql`
  applied to the live project through the Supabase SQL Editor (account holder).
- An editor account and a viewer account.

## Automated checks

```bash
npx vitest run lib/local/group-requirements.test.ts app/actions/group-requirements.test.ts components/GroupRequirements.test.tsx lib/requirement-seed.test.ts
```

Covers: local CRUD, ordering and cascade; every action refused for viewers and signed-out
callers with nothing changed; blank names refused; optimistic status change and delete with
rollback; no counts rendered; migration seed identical to the spec appendix.

## Scenario 0 — Before the migration (research Decision 4)

With the code deployed and 0015 **not** applied, open `/documents/checklist-permit`.

- The page loads exactly as before: no error, no descriptions, no items.
- In management mode, adding an item reports that the checklist is not enabled yet.

## Scenario 1 — See what is missing (US1, SC-001)

Apply 0015. As a viewer on a 375px screen, open หมวด 6.

- Every sub-group shows its description and items under its name without being expanded.
- Each item shows an icon and a Thai status label; missing and waiting items are readable
  with colour turned off.
- Nothing on the page says how many items are in or missing.

## Scenario 2 — Content matches the audit (US3, SC-002)

- Compare each sub-group against the spec appendix: same items, order, statuses, notes.
- Run the migration a second time: nothing is duplicated and nothing changes.

## Scenario 3 — Record an arrival (US2, SC-003)

As an editor, turn on management mode.

- Under ใบรับรองและสเปก, tap มีแล้ว on "ใบรับรอง (Certificate) Emergency Shower" and add a
  note. Reload: both stick. A viewer sees the change.
- Add an item, rename it, move it up, delete it. Reload after each: the change holds.
- Edit and clear a sub-group description; clear it to spaces and confirm it disappears.
- Block the network and change a status: it reverts and an error is shown (SC-005).

## Scenario 4 — Viewer refused (FR-013, SC-004)

Covered by `app/actions/group-requirements.test.ts`; no manual step.

## Scenario 5 — Deleting a sub-group

In a scratch category, add a sub-group with two items, then delete the sub-group.

- The items are gone with it; no document in any other sub-group is affected.
