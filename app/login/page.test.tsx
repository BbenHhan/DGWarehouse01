/** @vitest-environment jsdom */
import "../../vitest.setup.dom";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithPassword = vi.fn();
const signInWithOAuth = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: (...a: unknown[]) => signInWithPassword(...a),
      signInWithOAuth: (...a: unknown[]) => signInWithOAuth(...a),
      signUp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
  }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const LoginPage = (await import("@/app/login/page")).default;

beforeEach(() => {
  vi.clearAllMocks();
  // The page navigates with a hard assign on success; jsdom would otherwise
  // log "not implemented" and the assertion below would be about noise.
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, assign: vi.fn(), origin: "http://localhost:3000" },
  });
});

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText(/อีเมล/i), "somchai@example.com");
  await user.type(screen.getByPlaceholderText(/รหัสผ่าน/i), "hunter2hunter2");
  await user.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));
}

describe("sign-in form", () => {
  // FR-005: the button used to grey out with no other change, so on a slow
  // connection the screen looked frozen.
  it("says it is checking while the credentials are in flight", async () => {
    const user = userEvent.setup();
    signInWithPassword.mockReturnValue(new Promise(() => {}));

    render(<LoginPage />);
    await fillAndSubmit(user);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /กำลังเข้าสู่ระบบ/ })).toBeDisabled()
    );
  });

  // FR-012b: sign-in ends in a page load. Clearing the state on success would
  // reopen the button for the whole span before the next screen appears.
  it("stays busy after a successful sign-in, through the navigation", async () => {
    const user = userEvent.setup();
    signInWithPassword.mockResolvedValue({ error: null });

    render(<LoginPage />);
    await fillAndSubmit(user);

    await waitFor(() => expect(window.location.assign).toHaveBeenCalledWith("/photos"));
    expect(screen.getByRole("button", { name: /กำลังเข้าสู่ระบบ/ })).toBeDisabled();
  });

  // FR-003: a rejection must free the button and say why, in Thai.
  it("frees the button and shows the reason when sign-in is rejected", async () => {
    const user = userEvent.setup();
    signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });

    render(<LoginPage />);
    await fillAndSubmit(user);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "เข้าสู่ระบบ" })).toBeEnabled()
    );
    expect(screen.getByText(/อีเมลหรือรหัสผ่านไม่ถูกต้อง/)).toBeInTheDocument();
  });
});
