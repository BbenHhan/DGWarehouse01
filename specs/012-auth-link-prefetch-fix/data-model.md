# Data Model: Prevent Email-Scanner Link Prefetch from Consuming Confirmation Codes

No new entities, no schema changes. This feature changes *when* an existing one-time PKCE code (already fully managed by Supabase Auth) gets exchanged for a session — from "automatically on any GET" to "only on an explicit button click" — not what is stored or how accounts/roles/sessions are modeled.
