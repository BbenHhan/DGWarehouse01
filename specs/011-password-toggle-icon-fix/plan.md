# Implementation Plan: Password Toggle Icon Correction

**Branch**: `011-password-toggle-icon-fix` | **Date**: 2026-07-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/011-password-toggle-icon-fix/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Swap the icon branches in `components/ui/password-input.tsx` (Feature 010) so the crossed-eye represents the masked/hidden state and the open-eye represents the revealed state — a one-line ternary flip, automatically correct on all three password fields since they share this one component.

## Technical Context

**Language/Version**: TypeScript, Next.js 15 (App Router)

**Primary Dependencies**: `lucide-react` (already in use — same `Eye`/`EyeOff` icons, just reassigned)

**Storage**: N/A

**Testing**: No new Vitest coverage — same reasoning as Feature 010, purely presentational; verified live via quickstart.md

**Target Platform**: Web (Vercel), mobile-first browser per Constitution IV

**Project Type**: Web app (single Next.js project — no new project/package)

**Performance Goals**: N/A

**Constraints**: No behavior change beyond the icon mapping (FR-004)

**Scale/Scope**: One line, one file (`components/ui/password-input.tsx`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

All principles: N/A or unaffected — this is a one-line icon-mapping correction inside an already-reviewed component (Feature 010), touching no routing, data, auth, or styling-system concern beyond swapping which of two already-approved icons renders in which already-existing state.

No violations — Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/011-password-toggle-icon-fix/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory — no interface changes.

### Source Code (repository root)

```text
components/ui/password-input.tsx    # MODIFIED: swap the visible ? EyeOff : Eye ternary to visible ? Eye : EyeOff
```

**Structure Decision**: Single-line change to the one component Feature 010 already established as the shared source of truth — no other file needs to change, since all three password fields already delegate to it.

## Complexity Tracking

*No violations — this section is intentionally empty.*
