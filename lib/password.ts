// Minimum password strength check for specs/006-email-password-auth. This is
// a UX-only floor — Supabase Auth's own server-side minimum length is the
// real enforcement boundary (research.md Decision 4); this just gives
// immediate feedback before a round trip.
const MIN_PASSWORD_LENGTH = 8;

export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`;
  }
  return null;
}
