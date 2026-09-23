# Data Model: End-to-End Scenarios

No schema change. The only new data is the fixture each run creates.

## Fixture (rebuilt per run, in `.e2e-data/`)

| Thing | Content | Used by |
|---|---|---|
| Document category | `หมวดทดสอบ E2E`, slug from the store | US1, US2 |
| Sub-groups | `ใบรับรองและสเปก` (holds one file), `ผลทดสอบ` (empty), and one with a deliberately long name | US1, US2, US4 |
| Requirement items | three under `ใบรับรองและสเปก`: one มีแล้ว, one ยังขาด, one รอดำเนินการ with a note | US1 |
| Document | one small PDF in `ใบรับรองและสเปก` | US2 |
| Checklist task | one task tagged to two rooms | US3 |
| Rooms / work types | the fixed lists the local backend already provides | US2, US3, US4 |

Rooms and work types come from the app's own lookup lists, so the scenarios use the same ids the app does.

## Run modes

| Mode | Sign-in | Data | Purpose |
|---|---|---|---|
| `app` | off | local, `.e2e-data/` | US1–US4 |
| `guarded` | required | local, `.e2e-data/` | US5 only |
