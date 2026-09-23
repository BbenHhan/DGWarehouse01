// Sign-in is required. A local test run may ask for it to be off — the
// browser-driven scenarios (specs/049) cannot hold an account or type a
// password — and a deployment may never ask (FR-009, FR-010).
//
// Vercel sets VERCEL in its environment, so an instance that reached a
// deployment ignores the switch however it is set: the app cannot be left open
// by a variable somebody forgot to unset. lib/auth-config.test.ts is what holds
// that rule down.
//
// Deliberately not a NEXT_PUBLIC_ name: nothing in the browser reads this, and a
// private variable is read when the server starts rather than written into the
// build, so the same build can be served with sign-in on or off.
const ON_A_DEPLOYMENT = Boolean(process.env.VERCEL);

export const AUTH_REQUIRED = ON_A_DEPLOYMENT || process.env.AUTH_REQUIRED !== "false";
