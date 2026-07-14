# Implementation Plan: Password Visibility Toggle

**Branch**: `010-password-visibility-toggle` | **Date**: 2026-07-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/010-password-visibility-toggle/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add a new `components/ui/password-input.tsx` primitive — a thin wrapper around the existing `Input` component with an eye/eye-off toggle button that switches `type="password"` ↔ `type="text"` — and swap all three existing password `<Input type="password">` usages (`app/login/page.tsx` sign-in and sign-up fields, `app/reset-password/page.tsx`) to use it. Purely a display change; no validation, submission, or data-model impact.

## Technical Context

**Language/Version**: TypeScript, Next.js 15 (App Router)

**Primary Dependencies**: `lucide-react` (`Eye`/`EyeOff` icons, already in use), existing `components/ui/input.tsx`

**Storage**: N/A — no persisted state (data-model.md)

**Testing**: No new Vitest coverage — purely presentational, no business-logic branch to test in isolation (research.md Decision 4); verified live via quickstart.md

**Target Platform**: Web (Vercel), mobile-first browser per Constitution IV

**Project Type**: Web app (single Next.js project — no new project/package)

**Performance Goals**: N/A — client-side state toggle, no network or render-cost concern

**Constraints**: Tailwind-only styling via existing shadcn conventions (Constitution VI), keyboard-operable per FR-005

**Scale/Scope**: One new file (`components/ui/password-input.tsx`) + three call-site swaps across two existing files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. App Router Only**: N/A — no routing changes.
- **II. Server Actions & Supabase Client Boundary**: N/A — no mutations, no Supabase interaction at all; this is a client-side rendering concern only.
- **III. Storage-Agnostic File Persistence**: N/A.
- **IV. Thai-First, Mobile-First UI**: ✅ `aria-label`s in Thai ("แสดงรหัสผ่าน"/"ซ่อนรหัสผ่าน"), touch-friendly tap target size consistent with the rest of the app's mobile-first controls.
- **V. Resilient Async UX**: N/A — this isn't an async action; there's no loading/error state to speak of (a synchronous, instant toggle).
- **VI. Tailwind-Only Styling**: ✅ Built as a shadcn-style primitive using the same Tailwind utility approach as `components/ui/input.tsx`/`select.tsx`.
- **VII. Multi-User Auth with Role-Based Access Control**: N/A — no auth/role logic touched, purely how existing password fields render.
- **VIII. Universal File Attachments**: N/A.

No violations — Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/010-password-visibility-toggle/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory — pure UI component, no external interface.

### Source Code (repository root)

Single Next.js project (existing structure, no new project/package):

```text
components/ui/
└── password-input.tsx     # NEW: PasswordInput — wraps Input with an Eye/EyeOff toggle button

app/login/page.tsx          # MODIFIED: sign-in and sign-up password fields use PasswordInput
app/reset-password/page.tsx  # MODIFIED: new-password field uses PasswordInput
```

**Structure Decision**: One new primitive alongside the app's existing `components/ui/*` shadcn-style components, plus swapping three existing `<Input type="password">` call sites to use it — no new pages, no new Server Actions, no schema changes.

## Complexity Tracking

*No violations — this section is intentionally empty.*
