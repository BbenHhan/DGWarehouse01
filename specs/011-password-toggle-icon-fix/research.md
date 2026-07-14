# Research: Password Toggle Icon Correction

## Decision 1: Swap the ternary in `components/ui/password-input.tsx`

**Decision**: Change `{visible ? <EyeOff .../> : <Eye .../>}` to `{visible ? <Eye .../> : <EyeOff .../>}` — nothing else in the component changes.

**Rationale**: Feature 010's icon logic represented "what happens if you click" (next action); the user wants "what's happening right now" (current state) instead — `EyeOff` (crossed) when masked/`visible === false`, `Eye` (open) when revealed/`visible === true`. Since `visible` already tracks exactly the state needed, this is a one-line swap of which branch renders which icon, not a new state variable or restructuring.

**Alternatives considered**: None — this is a single, unambiguous correction with one correct mapping (the one the user specified), not a design space to explore.

## Decision 2: `aria-label` wording is unaffected

**Decision**: Keep the existing "แสดงรหัสผ่าน" (show password) / "ซ่อนรหัสผ่าน" (hide password) labels exactly as-is — they already describe the next action correctly and unambiguously; only the icon's state-representation was backwards.

**Rationale**: The user's complaint was specifically about the icon, not the label (FR-004's explicit scope boundary). A screen-reader user was never given incorrect information — this fix is a purely visual/sighted-user correction.
