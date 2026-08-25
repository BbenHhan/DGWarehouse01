# Feature Specification: Multi-Theme System

**Feature Branch**: `main`

**Created**: 2026-08-21

**Status**: Draft

**Input**: "UI ไม่เข้ากัน สีไม่เข้ากันเลย เปลี่ยน design web ให้ดูสวยขึ้นหน่อย เอาแบบ ดู tech UX ดี เป็นตัวอย่างให้ดูก่อนนะ ขอหลายๆแบบให้ฉันเลือกที" — the account holder found the current app's colors inconsistent and asked for a nicer, more "tech UX" redesign, with several options to choose from before anything was built. Three live mockups were shown (Clean Slate: light, minimal SaaS-style; Site Ops: dark, technical/monospace dashboard; Soft Studio: warm pastel, rounded) and iterated on Soft Studio once more into a cuter, pixel/cartoon-bordered variant before the final decision.

Clarified with the account holder across the mockup rounds:
1. Four named modes, not three: **Light** (Clean Slate), **Dark** (Site Ops), **Minimal** (the original Soft Studio warm-pastel look — this is the **default** mode), and **Pixel** (the cuter pixel/cartoon-bordered variant of Soft Studio, a distinct fourth mode, not a replacement of Minimal).
2. A mode switcher belongs in the header's top task bar, to the left of the user's avatar.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pick a look that actually feels put together (Priority: P1)

**Why this priority**: The entire request started from the current UI feeling visually inconsistent — this is the core problem being solved.

**Independent Test**: Open the app fresh (no prior theme choice); confirm it renders in Minimal mode. Switch to each of the other three modes from the header control; confirm every visible surface (header, sidebar, cards, buttons, badges, room-colored checklist rows) recolors consistently as a whole, not just part of the page.

**Acceptance Scenarios**:

1. **Given** a first-time visit with no stored preference, **When** any page loads, **Then** it renders in Minimal mode.
2. **Given** any page, **When** a mode is picked from the header switcher, **Then** the entire visible UI (chrome and content alike) switches to that mode's colors immediately, with no partially-updated/mixed-theme flash.
3. **Given** a mode has been picked, **When** the page is reloaded or a different page in the app is visited, **Then** the same mode is still active (the choice persists on this device).

### User Story 2 - Switch modes from the header, next to the account menu (Priority: P1)

**Why this priority**: A theme picker that's hard to find doesn't get used — the account holder specifically asked for it in the header task bar, beside the avatar.

**Independent Test**: Open the header on any page; confirm a mode-switcher control sits immediately to the left of the user's avatar/account menu, and opening it lists all four modes by name.

**Acceptance Scenarios**:

1. **Given** the header, **When** it's viewed on any page, **Then** the mode switcher appears to the left of the account avatar.
2. **Given** the mode switcher is opened, **When** its options are viewed, **Then** all four modes (Light, Dark, Minimal, Pixel) are listed, with the currently-active one indicated.

### Edge Cases

- A device/browser with no prior visit shows Minimal mode with no flash of a different mode's colors first (the default must be correct on the very first paint, not corrected after a client-side script runs).
- Every checklist room color (specs/032-checklist-detail-status-colors) keeps working as its own accent inside whichever of the four modes is active — the room-color system and the mode system are independent, not conflicting.

## Requirements *(mandatory)*

- **FR-001**: The app MUST support four selectable visual modes: Light, Dark, Minimal, and Pixel.
- **FR-002**: Minimal MUST be the default mode for a device with no prior selection.
- **FR-003**: A control in the header, positioned immediately to the left of the user's avatar, MUST let the user switch between all four modes at any time.
- **FR-004**: The selected mode MUST apply consistently across the entire visible UI (header, sidebar, page content, cards, buttons, form controls) — no page or component may be left in a different mode's colors.
- **FR-005**: The selected mode MUST persist across reloads and page navigation on the same device.
- **FR-006**: Pixel mode MUST visually read as a distinct, more playful/cartoon variant of Minimal (same warm pastel palette family, chunkier borders and flatter, offset drop-shadows rather than soft blurred ones), not merely a font change.
- **FR-007**: Dark mode MUST be a genuinely low-light palette (dark backgrounds, light text) suited to the "technical dashboard" mockup direction shown and approved.

### Key Entities

- **Theme Mode**: One of `light` / `dark` / `minimal` / `pixel` — a client-side, per-device preference, not stored per-account or server-side.

## Success Criteria *(mandatory)*

- **SC-001**: The account holder can switch between four visually distinct, internally-consistent looks from one control in the header, with the same look applying everywhere in the app.
- **SC-002**: Reopening the app on the same device shows whatever mode was last chosen, with Minimal as the untouched starting point for a new device.

## Assumptions

- Theme preference is a per-device `localStorage` value, not synced across the account holder's devices or stored in Supabase — matches how the account holder framed this purely as a visual/UX preference, with no mention of needing it to follow them between devices.
- Room colors (specs/032) are left as already implemented, additive pastel accents layered on top of whichever mode is active — no changes requested to that system here.
