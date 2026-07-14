import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { AUTH_REQUIRED } from "@/lib/auth-config";
import { meetsRole, type Role } from "@/lib/roles";

/**
 * Session-aware client (anon key + request cookies). Used to determine who is
 * currently logged in (auth.getUser(), sign-in/out, code exchange) — never for
 * data mutations, since it only carries the anon key.
 */
export async function createSessionClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render, where cookies can't be
            // written. Session refresh already happens in middleware.ts.
          }
        },
      },
    }
  );
}

/**
 * Privileged client (service role key, no session). Bypasses RLS, so every
 * Server Action MUST call requireUser() first — this client trusts its caller,
 * not the database, to enforce the single-user access boundary.
 */
export function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function requireUser() {
  if (!AUTH_REQUIRED) {
    return null;
  }

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }

  return user;
}

// Reads a user's stored role (specs/007-role-based-access) via the
// service-role client — the profiles table has no client-side read/write
// policy that would make this work through the session client, by design
// (research.md Decision 4: only Server Actions/Server Components touch
// roles, using the service client, same as every other privileged read in
// this app). Defaults to "viewer" if no row exists yet, which shouldn't
// happen once the on_auth_user_created trigger has run, but fails safe.
export async function getUserRole(userId: string): Promise<Role> {
  const supabase = createServiceClient();
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return (data?.role as Role | undefined) ?? "viewer";
}

// Whether an account has a role request awaiting admin action
// (specs/008-role-requests-search) — used to show a pending indicator
// instead of a resubmittable button in the account menu.
export async function hasPendingRoleRequest(userId: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { count } = await supabase
    .from("role_requests")
    .select("id", { count: "exact", head: true })
    .eq("requester_id", userId)
    .eq("status", "pending");
  return Boolean(count);
}

// Display-only read for the header's account menu — unlike requireUser(),
// this never throws. requireUser() guards privileged Server Actions (throwing
// means "reject this mutation"); this just answers "who's signed in, if
// anyone," so callers (a Server Component render) never need a try/catch for
// what is, for them, a perfectly normal case (specs/004-user-account-menu).
// Also carries role (specs/007-role-based-access) and hasPendingRequest
// (specs/008-role-requests-search) so callers can gate UI without extra
// round trips.
export async function getCurrentUser(): Promise<{
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: Role;
  hasPendingRequest: boolean;
} | null> {
  if (!AUTH_REQUIRED) {
    return null;
  }

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return null;
  }

  return {
    email: user.email,
    name: user.user_metadata?.full_name ?? null,
    avatarUrl: user.user_metadata?.avatar_url ?? null,
    role: await getUserRole(user.id),
    hasPendingRequest: await hasPendingRoleRequest(user.id),
  };
}

// Guards privileged Server Actions that require more than "signed in"
// (specs/007-role-based-access): content mutations need at least "editor",
// role changes need "admin". Throws "UNAUTHENTICATED" (no session) or
// "FORBIDDEN" (signed in, insufficient role) — callers distinguish these
// the same way they already handle requireUser()'s throw. Short-circuits
// to full access when !AUTH_REQUIRED, matching requireUser()'s existing
// dev-bypass behavior.
export async function requireRole(
  minRole: Role
): Promise<{ id: string; email: string; role: Role }> {
  if (!AUTH_REQUIRED) {
    return { id: "dev", email: "dev@local", role: "admin" };
  }

  const user = await requireUser();
  if (!user || !user.email) {
    throw new Error("UNAUTHENTICATED");
  }

  const role = await getUserRole(user.id);
  if (!meetsRole(role, minRole)) {
    throw new Error("FORBIDDEN");
  }

  return { id: user.id, email: user.email, role };
}
