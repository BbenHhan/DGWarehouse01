import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { AUTH_REQUIRED } from "@/lib/auth-config";

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

// Display-only read for the header's account menu — unlike requireUser(),
// this never throws. requireUser() guards privileged Server Actions (throwing
// means "reject this mutation"); this just answers "who's signed in, if
// anyone," so callers (a Server Component render) never need a try/catch for
// what is, for them, a perfectly normal case (specs/004-user-account-menu).
export async function getCurrentUser(): Promise<{
  email: string;
  name: string | null;
  avatarUrl: string | null;
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
  };
}
