# Feature Specification: Production Build Fix

**Feature Branch**: `main`

**Created**: 2026-08-21

**Status**: Implemented

**Input**: Found by this agent while running a pre-deploy `npm run build` check (part of preparing to deploy to Vercel) — not something the account holder reported, since it only manifests in a production build, never in `next dev`, which is all that had been used all session. `next build` failed outright with `useSearchParams() should be wrapped in a suspense boundary at page "/login"`, aborting the entire build.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The site can actually be built for production (Priority: P1)

**Why this priority**: Without this fix, `next build` fails completely — the app could never be deployed anywhere (Vercel or otherwise), regardless of how correct the app's runtime behavior is in dev mode.

**Independent Test**: Run `npx next build` from a clean `.next` directory; confirm it completes successfully and generates all expected static/dynamic routes, including `/login` and `/auth/confirm`.

**Acceptance Scenarios**:

1. **Given** a clean build, **When** `next build` runs, **Then** it completes with no errors and reports all 13 routes generated.
2. **Given** the built output, **When** `/login` or `/auth/confirm` is requested, **Then** they render exactly as they did before this fix (no visible behavior change — this is a build-mechanics fix, not a feature change).

### Edge Cases

- Any other page using `useSearchParams()` without a Suspense boundary would hit the identical failure — this feature's fix pattern generalizes to any future page with the same need.

## Requirements *(mandatory)*

- **FR-001**: `next build` MUST complete successfully with no prerender errors.
- **FR-002**: Pages using `useSearchParams()` MUST wrap the part of the tree that calls it in a `<Suspense>` boundary.
- **FR-003**: This fix MUST NOT change any page's visible behavior or content — purely a build/rendering-mechanics correction.

## Success Criteria *(mandatory)*

- **SC-001**: `npm run build` succeeds from a clean state, 100% of the time, given no other unrelated errors are introduced later.

## Assumptions

- This class of bug is invisible in `next dev` by design (Next.js only enforces the Suspense requirement during static prerendering, which dev mode doesn't perform) — meaning routine dev-server verification throughout this whole session could never have caught it. It surfaced specifically because deploy-prep included an actual production build check, which is why that check is valuable practice going forward, not just for this one deploy attempt.
