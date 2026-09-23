# Contract: how a run is arranged

## Settings

| Setting | Default | Effect |
|---|---|---|
| `NEXT_PUBLIC_DATA_SOURCE` | unset → `supabase` | `local` points the app at a directory instead of the live project |
| `NEXT_PUBLIC_AUTH_REQUIRED` | unset → sign-in required | `false` switches sign-in off — **ignored whenever the deployment environment is present** |
| `LOCAL_DATA_DIR` | unset → `.local-data/` | where the local backend keeps its data |

With all three unset, the app behaves exactly as it does today (FR-011).

## The command

`npm run test:e2e` — seeds the fixture, starts both app instances, runs every scenario, stops them, and reports. Nothing to prepare (FR-004, FR-005).

## What each scenario file proves

| File | Proves |
|---|---|
| `documents-checklist.spec.ts` | items visible without expanding; add, re-status and delete each survive a reload (US1) |
| `documents-files.spec.ts` | upload appears under the chosen sub-group; the archive downloads and opens with a folder per sub-group and the file inside; delete removes it (US2) |
| `photos.spec.ts` | a photo uploads into a room and work type, shows in the grid, and can be deleted (US2) |
| `room-checklist.spec.ts` | ticking a two-room task in one room leaves the other outstanding, and survives a reload (US3) |
| `mobile.spec.ts` | at 375px no page scrolls sideways and no control sits off the edge, including a long sub-group name (US4) |
| `signed-out.spec.ts` | with sign-in required, every main page sends a signed-out visitor to the login screen, and the login screen itself loads (US5) |
