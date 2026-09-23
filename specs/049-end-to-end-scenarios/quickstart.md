# Quickstart: End-to-End Scenarios

## Prerequisites

None beyond the repository's own install. The first run downloads the browser Playwright drives.

```bash
npx playwright install chromium   # once
```

## Run everything

```bash
npm run test:e2e
```

Seeds `.e2e-data/`, starts both app instances, runs every scenario, stops them.

## Watch it happen

```bash
npm run test:e2e:headed
```

## Expected

All scenarios pass. Running twice in a row gives the same result, and `.local-data/` is untouched.

## Prove the scenarios are worth having (SC-005)

Break one behaviour at a time and confirm the matching scenario fails:

- make a status change not persist (drop the write, keep the optimistic update) → the checklist reload check fails
- send the whole task instead of the room when ticking → the room scenario fails
- restore the old category header that overflowed at 375px → the mobile scenario fails
- let a signed-out visitor through → the signed-out scenario fails
