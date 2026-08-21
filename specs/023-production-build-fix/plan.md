# Implementation Plan: Production Build Fix

**Branch**: `main` | **Date**: 2026-08-21 | **Spec**: [spec.md](spec.md)

## Summary

Both `app/login/page.tsx` and `app/auth/confirm/page.tsx` are `"use client"` components that call `useSearchParams()` at their top level and were each their own route's default export. Next.js requires any component using `useSearchParams()` to sit beneath a `<Suspense>` boundary so the route can still be statically prerendered (the search-params-dependent part bails out to client rendering, the rest doesn't have to). Fixed identically in both files: renamed the existing component to a `*Content` inner component, and made the page's default export a thin wrapper that renders `<Suspense><XContent /></Suspense>` with no custom fallback (an empty fallback is acceptable here since both pages render near-instantly and a flash of blank content is preferable to a custom loading skeleton neither page previously had).

## Technical Context

**Language/Version**: TypeScript / Next.js 15 App Router.

**Primary Dependencies**: `Suspense` from `react` (already available, no new dependency).

**Testing**: Verified via `npx next build` end-to-end (the only way to actually reproduce/verify this class of bug — `next dev` never exercises the static-prerendering code path that enforces the Suspense requirement).

**Constraints**: The fix must not change either page's actual runtime behavior — confirmed by re-running the full existing verification suite (`tsc`, `lint`, `test`) plus the build itself, all clean.

## Constitution Check

No principle implicated — pure build-mechanics correction, zero behavior change.

## Project Structure

```text
app/
├── login/page.tsx           # MODIFIED — LoginPageContent extracted, wrapped in Suspense
└── auth/confirm/page.tsx    # MODIFIED — AuthConfirmPageContent extracted, wrapped in Suspense
```
