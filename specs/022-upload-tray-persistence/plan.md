# Implementation Plan: Upload Tray Persistence

**Branch**: `main` | **Date**: 2026-08-19 (retroactive) | **Spec**: [spec.md](spec.md)

## Summary

New `lib/upload-tray-db.ts`: a thin IndexedDB wrapper (`saveTrayFile`, `deleteTrayFile`, `loadAllTrayFiles`) storing `{ id, file, confirmedFor, addedAt }` records. `BulkUploadWorkspace.tsx` wired to it at every point the tray's file list already changes: `addFiles` saves each new item; `removeFiles` (called on both successful-upload cleanup and explicit discard) deletes; `duplicateFile` saves the new copy; `assignFileKeepInTray`'s success path re-saves the updated `confirmedFor`. On mount, a `useEffect` calls `loadAllTrayFiles()` and merges any restored entries into state (as `status: "waiting"`, previewUrls regenerated via `URL.createObjectURL`), with a toast confirming the count. The upload date additionally round-trips through `localStorage` on every change.

## Technical Context

**Language/Version**: TypeScript, browser `indexedDB` API directly (no wrapper library — the API surface needed is small: one object store, put/delete/getAll).

**Primary Dependencies**: None new.

**Storage**: Client-side only — IndexedDB (`dgwh-upload-tray` database) + `localStorage` (one key for the date). No server/Supabase involvement at all, by design (spec FR-006).

**Testing**: No new Vitest coverage — IndexedDB isn't available in the Vitest/jsdom test environment this project uses without additional polyfill setup, and the wrapper functions are thin, direct API calls with no complex branching logic of their own; verified via `tsc`/`lint` and dev-server compile review instead.

**Constraints**: Must degrade gracefully (not crash) if IndexedDB is unavailable — wrapped in a `.catch()` on the load call.

## Constitution Check

No principle implicated directly — this is client-side-only persistence layered onto an existing, already-compliant upload flow (Feature 015/018); no Server Action, schema, or auth surface touched.

## Project Structure

```text
lib/
└── upload-tray-db.ts          # NEW — IndexedDB wrapper for the unsorted tray

components/
└── BulkUploadWorkspace.tsx     # MODIFIED — wired to upload-tray-db.ts at every tray-mutating point; mount-time restore; date persisted via localStorage
```
