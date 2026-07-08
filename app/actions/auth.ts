"use server";

import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";

// Unlike every other Server Action in this app, this doesn't return an
// ActionResult<T> — redirect() aborts rendering via a thrown control-flow
// signal on success; on failure it throws a real error the caller
// (AccountMenu) catches to show toast.error (specs/004-user-account-menu).
export async function signOut(): Promise<void> {
  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }

  redirect("/login");
}
