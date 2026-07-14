# Research: Password Visibility Toggle

## Decision 1: A new `components/ui/password-input.tsx` primitive

**Decision**: A new shadcn-style component, `PasswordInput`, sitting alongside the existing `components/ui/input.tsx`/`select.tsx` primitives — a thin wrapper that renders the existing `Input` component inside a positioned container with an absolute-positioned toggle button, switching `type="password"` ↔ `type="text"` on click.

**Rationale**: FR-003 requires one shared implementation, not three copies. Placing it in `components/ui/` (rather than a one-off component in `components/`) matches this app's existing convention — every other shadcn-style form primitive (`Input`, `Select`, `Button`) lives there, and this is exactly that kind of primitive: a self-contained, app-wide reusable form control, not a feature-specific component like `PhotoUploader` or `UserRoleTable`.

**Alternatives considered**: A `showPassword` boolean prop added to the existing `Input` component — rejected because it would make every non-password `Input` usage in the app (email fields, search fields, etc.) carry an unused prop path for a concern that only applies to password fields; a dedicated component keeps the concern isolated.

## Decision 2: Toggling `type` directly, not a separate "reveal" overlay

**Decision**: The toggle switches the underlying `<input>` element's `type` attribute between `"password"` and `"text"` — the same value is never touched, only how the browser renders it (FR-002/FR-006).

**Rationale**: This is exactly what `type="password"` vs `type="text"` already means at the HTML level — no custom masking/unmasking logic is needed, and the browser's own autofill/paste/keyboard behavior for text inputs keeps working unmodified (nothing in FR-006 or the spec's "out of scope" list asked for anything beyond this).

**Alternatives considered**: None seriously — this is the standard, well-established pattern for this exact UI control (used by virtually every password field with a "show password" option), not a case with multiple reasonable approaches worth comparing.

## Decision 3: Icon and accessibility

**Decision**: `lucide-react`'s `Eye`/`EyeOff` icons (already the app's icon library — used throughout Features 004/007/008) inside a real `<button type="button">` with an `aria-label` that states the *next* action ("แสดงรหัสผ่าน" / "ซ่อนรหัสผ่าน" — show/hide password), not the current state.

**Rationale**: A real `<button>` is natively keyboard-operable (Tab to focus, Enter/Space to activate) with no extra work, satisfying FR-005 for free. Labeling by "what happens if you press this" (rather than "what state it's in now") is the clearer convention for a toggle control's accessible name — matches FR-004's "must not be ambiguous which action it performs next."

**Alternatives considered**: A checkbox styled as a toggle — rejected as unnecessarily unusual markup for what every user already recognizes as an icon-button pattern.

## Decision 4: No new tests

**Decision**: No new Vitest coverage — this is a small, purely presentational client component with no business-logic branch worth unit-testing in isolation from its rendered DOM; verified live via quickstart.md, consistent with how Features 006–009 scoped testing to only genuinely pure logic.

**Rationale**: The entire behavior (toggle `type` on click) is one line of state — testing it would mean re-testing that `useState` and a click handler work, which isn't this project's business logic, it's React itself.
