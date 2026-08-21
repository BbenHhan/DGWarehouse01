# Implementation Plan: Google OAuth Account Picker

**Branch**: `main` | **Date**: 2026-08-21 | **Spec**: [spec.md](spec.md)

## Summary

Supabase's `signInWithOAuth` forwards an `options.queryParams` object as extra query parameters on the underlying Google authorize request. Added `queryParams: { prompt: "select_account" }` to the existing `handleGoogleSignIn` call in `app/login/page.tsx` — Google's own documented OAuth parameter that forces the account chooser to display even when a session already exists, rather than silently reusing it.

## Technical Context

**Language/Version**: TypeScript, `@supabase/supabase-js` client SDK (already a dependency, no version change).

**Primary Dependencies**: None new.

**Testing**: Live-verified by this agent's own browser tool: clicked the real "เข้าสู่ระบบด้วย Google" button (without completing an actual sign-in) and inspected the resulting network request to `accounts.google.com/v3/signin/identifier`, confirming `prompt=select_account` present in the query string — done once from `localhost` and once from the account holder's real LAN IP origin, both correct.

## Constitution Check

No principle implicated — a one-parameter addition to an existing, already-compliant OAuth call (Constitution VII's "Supabase Auth... Google OAuth" requirement is unchanged, just now always shows the picker).

## Project Structure

```text
app/login/page.tsx   # MODIFIED — handleGoogleSignIn's options gains queryParams: { prompt: "select_account" }
```
