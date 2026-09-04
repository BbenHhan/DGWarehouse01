# UI Contracts: Loading Primitives

These are the interfaces this feature adds or changes. Everything else in the feature is
a call site of one of them.

## `useDelayedBusy(active: boolean): boolean`

New hook, `lib/use-delayed-busy.ts`.

| Input | Meaning |
|---|---|
| `active` | whether the work is in flight right now |

| Returns | Meaning |
|---|---|
| `boolean` | whether the indicator should currently be on screen |

Behaviour:

- `active` false → returns false
- `active` true for less than ~150 ms, then false → never returns true (FR-013)
- `active` true for longer → returns true, and stays true for at least ~400 ms after
  `active` goes false (FR-013a)
- Unmounting while a timer is pending must not update state

Note that this governs only the *indicator*. Disabling the control is immediate and is
the call site's job (FR-002).

## `SelectTrigger` — new `busy?: boolean` prop

Changed, `components/ui/select.tsx`.

- `busy` true → the trigger's `ChevronDownIcon` is replaced by the spinner, in the same
  slot, at the same size (FR-012a, SC-010)
- `busy` false or absent → today's behaviour exactly
- `busy` does not imply `disabled`; call sites pass both

## `Spinner` — unchanged

Already exists at `components/ui/spinner.tsx`. This feature adds call sites, not variants
(FR-012).

## `MediaLoadState`

The states a preview area can be in. Every previewed file passes through these, and no
area may sit outside them (FR-007).

| State | Shown |
|---|---|
| `loading` | skeleton, plus a share of the whole for a document or video (FR-014, FR-014c) |
| `ready` | the file itself, no placeholder remaining |
| `error` | a Thai message saying it could not be loaded (FR-008) |
| `unsupported` | the existing download fallback, no indicator (Story 3 scenario 4) |

## `fetchWithProgress(url, onProgress): Promise<Blob>`

New helper, `lib/fetch-with-progress.ts`. Used by the document preview only.

- Calls `onProgress(receivedBytes, totalBytes | null)` as the body streams in
- `totalBytes` is null when `Content-Length` is absent — the caller then reports bytes
  received without a share (FR-014a)
- Downloads the file once; the resolved blob is what gets displayed (FR-014b)
- On failure, rejects; the caller falls back to the direct URL so the preview is never
  less capable than it is today
