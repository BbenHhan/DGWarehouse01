import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client (anon key). Used only for realtime subscriptions and
 * read-only display — mutations always go through Server Actions.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
