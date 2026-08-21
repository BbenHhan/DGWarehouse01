---

description: "Task list for Google OAuth Account Picker"

---

# Tasks: Google OAuth Account Picker

**Input**: Design documents from `/specs/024-google-oauth-account-picker/`

**Status**: Retroactively documented — already implemented and live-verified.

## Phase 1: Fix

- [X] T001 In `app/login/page.tsx`'s `handleGoogleSignIn`, add `queryParams: { prompt: "select_account" }` to the `signInWithOAuth` options

## Phase 2: Verification

- [X] T002 [P] `npx tsc --noEmit` — clean
- [X] T003 [P] `npx next lint` — clean
- [X] T004 Live network-request check (this agent's own browser tool, real click, no completed login): confirmed `prompt=select_account` present in the actual request to `accounts.google.com` from `localhost:3000`
- [X] T005 Repeated T004 from `http://192.168.68.64:3000` (the account holder's real LAN IP at the time) — confirmed `redirect_to` correctly reflected that origin too, alongside `prompt=select_account`

## Summary

5/5 tasks complete — this is the most thoroughly live-verified fix of this whole
retroactive batch, since it was checked via real outgoing network requests, not just
static code review.
