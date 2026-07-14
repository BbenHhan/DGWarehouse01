// Role-based access control — specs/007-role-based-access. Pure rank
// comparison so it's unit-testable without a live Supabase project; the
// actual enforcement (Server Actions calling requireRole()) lives in
// lib/supabase/server.ts, which imports these.
export type Role = "viewer" | "editor" | "admin";

const ROLE_RANK: Record<Role, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
};

export function meetsRole(role: Role, minRole: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

export function canEdit(role: Role): boolean {
  return meetsRole(role, "editor");
}

export function isAdmin(role: Role): boolean {
  return meetsRole(role, "admin");
}
