# Implementation Plan: End-to-End Scenarios in a Real Browser

**Branch**: `feature/049-end-to-end-scenarios` | **Date**: 2026-09-23 | **Spec**: [spec.md](spec.md)

## Summary

Add a browser-driven suite that starts the app itself, seeds its own data, and walks the scenarios a person would: the document checklist through a reload, a file in and out again including the archive, a two-room tick, every main page at 375px, and the redirect to login when signed out. One command, no account, no live project.

Two small production changes make it possible: the data source and the sign-in switch become settable from the environment, with today's values as the defaults and the switch ignored outright on a deployment.

## Technical Context

**Language/Version**: TypeScript. Playwright Test, Chromium only.

**Primary Dependencies**: `@playwright/test` (dev only). Nothing added to the app's runtime.

**Storage**: The interim local backend, pointed at `.e2e-data/` — never the live project and never the developer's `.local-data/`.

**Testing**: Playwright for these scenarios; Vitest keeps everything it already covers. The two suites do not overlap: `npm test` stays fast, `npm run test:e2e` is the browser one.

**Target Platform**: The app as it runs in development, driven through Chromium at desktop and at 375px.

**Performance Goals**: The whole suite inside a couple of minutes, so it can run before a commit.

**Constraints**: No account, no password, no production data (FR-007, FR-008). Sign-in off only in a test run, impossible on a deployment (FR-009, FR-010). Today's behaviour unchanged when the new settings are unset (FR-011).

**Scale/Scope**: 1 config, 1 fixture seeder, 5 scenario files, 3 small production edits (`lib/data-config.ts`, `lib/auth-config.ts`, `lib/supabase/server.ts`), plus `.gitignore` and two npm scripts.

## Constitution Check

*GATE: passed before Phase 0; re-checked after Phase 1 below.*

- **I. App Router Only**: ✅ Nothing added to the app's routes.
- **II. Server Actions & Supabase Client Boundary**: ✅ Unchanged; the scenarios drive the UI, which calls the same actions.
- **III. Storage-Agnostic Persistence**: ✅ This is the principle paying off — the local backend is what makes a run without the live project possible. Making the choice settable from the environment is the flag the principle already describes, now readable at start-up instead of edited by hand.
- **IV. Thai-First, Mobile-First**: ✅ US4 is this principle under test, on every change rather than by hand.
- **V. Resilient Async UX**: ✅ The reload checks in US1 are what tell an optimistic update apart from a saved one.
- **VI. Tailwind-Only Styling**: ✅ Not engaged.
- **VII. RBAC**: ✅ US5 proves the page guard. Switching sign-in off is confined to a local run and refused on a deployment (research Decision 2); the actions' own role checks stay covered by feature 048.
- **VIII. Universal File Attachments**: ✅ US2 uploads through the real control.

**Post-design re-check**: ✅ No violations. The one risk — an instance left open — is closed by making the switch impossible to honour on a deployment, not by discipline.

## Project Structure

### Documentation (this feature)

```text
specs/049-end-to-end-scenarios/
├── spec.md
├── plan.md                 # this file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/run-modes.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
playwright.config.ts              # two run modes, each starting its own app
e2e/
├── fixture.ts                    # seeds .e2e-data before a run
├── documents-checklist.spec.ts   # US1
├── documents-files.spec.ts       # US2 (upload, archive, delete)
├── photos.spec.ts                # US2 (photo upload and delete)
├── room-checklist.spec.ts        # US3
├── mobile.spec.ts                # US4
└── signed-out.spec.ts            # US5

lib/
├── data-config.ts                # data source readable from the environment, default unchanged
├── auth-config.ts                # sign-in switch, default on, ignored on a deployment
└── supabase/server.ts            # with sign-in off, a local development identity
```

**Structure Decision**: Playwright's own directory at the root, beside the app, so Vitest keeps collecting only `*.test.ts(x)` and the two suites never run each other's files.

## Complexity Tracking

No constitution violations to justify.
