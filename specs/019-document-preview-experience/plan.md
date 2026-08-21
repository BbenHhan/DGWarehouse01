# Implementation Plan: Document Preview Experience

**Branch**: `main` | **Date**: 2026-07-30 (retroactive) | **Spec**: [spec.md](spec.md)

## Summary

`components/DocList.tsx` reworked in place: documents grouped by `note` into `Collapsible` sections (Base UI, same primitive already used elsewhere in the app); each document row itself became a per-file `Collapsible` whose panel renders a `DocumentPreview` (image via `next/image`, video via native `<video>`, PDF via `<iframe>`, other via a fallback message) preceded by a `DocumentActions` bar (download via fetch-to-blob, open via a plain link, share via `navigator.share`/clipboard fallback). No new dependencies — `@base-ui/react`'s `Collapsible` was already a project dependency used by `components/ui/dropdown-menu.tsx`.

## Technical Context

**Language/Version**: TypeScript / Next.js 15, client component (`"use client"`).

**Primary Dependencies**: `@base-ui/react/collapsible` (new `components/ui/collapsible.tsx` wrapper, same shadcn-style pattern as the rest of `components/ui/`), `lib/file-kind.ts` (existing), `lib/storage.ts`'s `publicFileUrl` (existing).

**Storage**: No change — reads the same `documents` rows Feature 017 already produces.

**Testing**: No new Vitest coverage — this is presentational/interaction logic with no pure-function surface worth isolating (grouping is a simple single-pass array reduction, not complex enough to warrant a dedicated test module, consistent with how this project reserves unit tests for date/logic-heavy `lib/*.ts` modules).

**Target Platform**: Same Next.js app, no platform change.

**Constraints**: Must never use a modal/dialog for the preview (explicit account-holder requirement, discovered via direct back-and-forth after an initial popup-based design was rejected). Download must work despite Supabase Storage being a different origin than the app (the `download` HTML attribute is silently ignored cross-origin — worked around with a fetch-to-blob-then-save approach).

## Constitution Check

- **III. Storage-Agnostic File Persistence**: ✅ Images still render via `next/image`; video via native `<video>`; PDF via direct-file-URL embed (not forced into an `<img>`) — matches the constitution's per-media-type rendering rules exactly.
- **IV. Thai-First, Mobile-First**: ✅ All new UI text in Thai; collapsible layout degrades to a single narrow column on mobile without extra work (flex layout, no fixed desktop-only widths).
- **VI. Tailwind-Only Styling**: ✅ No inline styles introduced.
- Everything else: N/A (no auth, schema, or Server Action changes).

No violations.

## Project Structure

```text
components/
├── DocList.tsx           # MODIFIED — grouping, per-file Collapsible preview, action bar
└── ui/
    └── collapsible.tsx    # NEW — shadcn-style wrapper over @base-ui/react/collapsible
```

**Structure Decision**: In-place modification of one existing component plus one new shared UI primitive wrapper, following the exact pattern every other `components/ui/*.tsx` file already uses.
