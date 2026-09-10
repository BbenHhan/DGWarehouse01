/** @vitest-environment jsdom */
import "../../vitest.setup.dom";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithPassword = vi.fn();
const signInWithOAuth = vi.fn();
const signUp = vi.fn();
const resetPasswordForEmail = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: (...a: unknown[]) => signInWithPassword(...a),
      signInWithOAuth: (...a: unknown[]) => signInWithOAuth(...a),
      signUp: (...a: unknown[]) => signUp(...a),
      resetPasswordForEmail: (...a: unknown[]) => resetPasswordForEmail(...a),
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

// specs/045-automate-manual-checks. Quickstart Scenario 6 of specs/041 also
// covers the other two ways into the app. They shared the sign-in form's fault
// — a button that greyed out and said nothing — and they were only ever checked
// by hand because they live behind an email round trip.
describe("sign-up form", () => {
  async function openSignUp(user: ReturnType<typeof userEvent.setup>) {
    render(<LoginPage />);
    await user.click(screen.getByRole("button", { name: "สมัครสมาชิก" }));
    await user.type(screen.getByPlaceholderText(/อีเมล/i), "somchai@example.com");
    await user.type(screen.getByPlaceholderText(/รหัสผ่าน/i), "hunter2hunter2");
    await user.click(screen.getByRole("button", { name: "สมัครสมาชิก" }));
  }

  it("says it is signing up while the request is in flight", async () => {
    const user = userEvent.setup();
    signUp.mockReturnValue(new Promise(() => {}));

    await openSignUp(user);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /กำลังสมัคร/ })).toBeDisabled()
    );
  });

  it("stays busy through the navigation when the account is signed in at once", async () => {
    const user = userEvent.setup();
    signUp.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null });

    await openSignUp(user);

    await waitFor(() => expect(window.location.assign).toHaveBeenCalledWith("/photos"));
    expect(screen.getByRole("button", { name: /กำลังสมัคร/ })).toBeDisabled();
  });

  it("frees the button and shows the reason when sign-up is rejected", async () => {
    const user = userEvent.setup();
    signUp.mockResolvedValue({ data: {}, error: { message: "User already registered" } });

    await openSignUp(user);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "สมัครสมาชิก" })).toBeEnabled()
    );
    expect(screen.getByText("User already registered")).toBeInTheDocument();
  });
});

describe("forgotten-password form", () => {
  async function openForgot(user: ReturnType<typeof userEvent.setup>) {
    render(<LoginPage />);
    await user.click(screen.getByRole("button", { name: "ลืมรหัสผ่าน?" }));
    await user.type(screen.getByPlaceholderText(/อีเมลของคุณ/i), "somchai@example.com");
    await user.click(screen.getByRole("button", { name: "ส่งลิงก์ตั้งรหัสผ่าน" }));
  }

  it("says it is sending while the link is on its way", async () => {
    const user = userEvent.setup();
    resetPasswordForEmail.mockReturnValue(new Promise(() => {}));

    await openForgot(user);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /กำลังส่งลิงก์/ })).toBeDisabled()
    );
  });

  it("confirms without revealing whether the address had an account", async () => {
    const user = userEvent.setup();
    resetPasswordForEmail.mockResolvedValue({ error: null });

    await openForgot(user);

    expect(await screen.findByText(/หากอีเมลนี้มีบัญชีอยู่/)).toBeInTheDocument();
  });

  it("frees the button and says so when the link cannot be sent", async () => {
    const user = userEvent.setup();
    resetPasswordForEmail.mockResolvedValue({ error: { message: "rate limited" } });

    await openForgot(user);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "ส่งลิงก์ตั้งรหัสผ่าน" })).toBeEnabled()
    );
    expect(screen.getByText(/ไม่สำเร็จ|ลองใหม่/)).toBeInTheDocument();
  });
});
