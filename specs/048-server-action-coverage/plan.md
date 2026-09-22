# Implementation Plan: Cover the Remaining Server Actions

**Branch**: `feature/048-server-action-coverage` | **Date**: 2026-09-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/048-server-action-coverage/spec.md`

## Summary

Add automated checks for the five Server Action modules that have none — photos, documents, checklist, accounts and sign-out — proving the rights gate, the rules that protect stored files, the upload allowlist, the checklist's room and sub-item behaviour, and the two account safeguards. Checks only: no action changes behaviour, and anything found is reported first (FR-017, SC-006).

## Technical Context

**Language/Version**: TypeScript, Vitest 4 (node environment; no browser needed for any of this).

**Primary Dependencies**: None new.

**Storage**: Two approaches, because the modules differ:
- **photos / documents / checklist** run against the interim local backend, which writes real files into a temp directory the test setup points it at. The whole path runs for real — rights gate, validation, store, disk — exactly as `app/actions/document-taxonomy.test.ts` does.
- **accounts / sign-out** have no local path; they always build a Supabase client. They are checked against a stand-in client, the shape already used by `lib/group-requirements-before-migration.test.ts`.
- The **Supabase branch of delete** (the one production runs) is also checked with a stand-in, because the order it does things in — remove the file, then the row — is the rule worth protecting.

**Testing**: Vitest only. No live database, no session, no network.

**Target Platform**: Same Next.js app.

**Performance Goals**: The suite stays fast enough to run on every change; these files add no I/O beyond a temp directory.

**Constraints**: No behaviour change (FR-017). Every new check must fail when its behaviour is reverted (FR-018).

**Scale/Scope**: 5 new test files, roughly 70–90 checks. No production file is edited unless a defect is found and the account holder approves the fix.

## Constitution Check

*GATE: passed before Phase 0; re-checked after Phase 1 below.*

- **I. App Router Only**: ✅ No routes added.
- **II. Server Actions & Supabase Client Boundary**: ✅ The checks assert this boundary rather than crossing it: in local mode the stand-in client throws if anything tries to build one.
- **III. Storage-Agnostic Persistence**: ✅ Both backends are exercised — local for the content actions, a stand-in for the Supabase branch of delete.
- **IV. Thai-First, Mobile-First**: ✅ Refusal messages are asserted in Thai, exactly as the app returns them.
- **V. Resilient Async UX**: ✅ Not engaged; these are server-side checks.
- **VI. Tailwind-Only Styling**: ✅ Not engaged.
- **VII. RBAC**: ✅ This is the point of US1: editor for content, admin for accounts, refused otherwise.
- **VIII. Universal File Attachments**: ✅ US3 proves the size and type checks run before anything is stored, on every upload path.

**Post-design re-check**: ✅ No violations. The stand-in client is a test double, not a second code path in the app.

## Project Structure

### Documentation (this feature)

```text
specs/048-server-action-coverage/
├── spec.md
├── plan.md                  # this file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/test-contract.md
├── checklists/requirements.md
└── tasks.md                 # /speckit-tasks
```

### Source Code (repository root)

```text
app/actions/
├── photos.test.ts            # new — local backend + stand-in for the Supabase delete
├── documents.test.ts         # new — local backend + stand-in for the Supabase delete
├── checklist.test.ts         # new — local backend
├── users.test.ts             # new — stand-in client only
└── auth.test.ts              # new — stand-in client only

lib/
└── supabase-stub.ts          # new — the shared stand-in client used by the tests above
```

No production file changes are planned. If a defect is found, it is reported and fixed only after the account holder agrees (FR-017).

**Structure Decision**: Tests live beside the actions they cover, as everywhere else in this project.

## Complexity Tracking

No constitution violations to justify.
