# Data Model: Don't Show Expired-Link Error When Session Already Established

No new entities, no schema changes. This changes decision logic inside one existing client component (`app/auth/confirm/page.tsx`) — what it checks before choosing which UI state to render — not any persisted data.
