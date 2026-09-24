import { describe, expect, it, vi } from "vitest";

// specs/048-server-action-coverage. signOut is the one action that returns
// nothing: on success it hands control to a redirect, and on failure it throws
// for the caller to catch and show.
const signOutFn = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createSessionClient: async () => ({ auth: { signOut: (...a: unknown[]) => signOutFn(...a) } }),
}));

// The real redirect() throws a control-flow signal Next catches; standing in for
// it keeps that shape while making the destination assertable.
const redirect = vi.fn((to: string) => {
  throw new Error(`REDIRECT:${to}`);
});
vi.mock("next/navigation", () => ({ redirect: (...a: [string]) => redirect(...a) }));

const { signOut } = await import("@/app/actions/auth");

describe("signing out", () => {
  it("ends the session and sends the person to the login page", async () => {
    signOutFn.mockResolvedValue({ error: null });

    await expect(signOut()).rejects.toThrow("REDIRECT:/login");

    expect(signOutFn).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  // Staying on the page with a live session is safer than pretending to have
  // signed out; the caller turns this into a message.
  it("throws and does not redirect when the session cannot be ended", async () => {
    signOutFn.mockResolvedValue({ error: { message: "network down" } });
    redirect.mockClear();

    await expect(signOut()).rejects.toThrow("network down");
    expect(redirect).not.toHaveBeenCalled();
  });
});
