import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

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
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }

  return user;
}
