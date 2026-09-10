/** @vitest-environment jsdom */
import "../../vitest.setup.dom";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// specs/045-automate-manual-checks. The last leg of specs/041 quickstart
// Scenario 6. It was manual only because reaching this page normally means
// clicking a link out of an email — nothing about the busy state itself needs a
// person.
const getUser = vi.fn();
const updateUser = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: (...a: unknown[]) => getUser(...a),
      updateUser: (...a: unknown[]) => updateUser(...a),
    },
  }),
}));

const ResetPasswordPage = (await import("@/app/reset-password/page")).default;

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, assign: vi.fn() },
  });
});

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByPlaceholderText(/รหัสผ่านใหม่/), "hunter2hunter2");
  await user.click(screen.getByRole("button", { name: "บันทึกรหัสผ่าน" }));
}

describe("reset-password form", () => {
  it("says it is checking the link before the form appears", async () => {
    getUser.mockReturnValue(new Promise(() => {}));
    render(<ResetPasswordPage />);

    expect(screen.getByText(/กำลังตรวจสอบลิงก์/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/รหัสผ่านใหม่/)).not.toBeInTheDocument();
  });

  it("says the link is spent rather than showing a form that cannot work", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    render(<ResetPasswordPage />);

    expect(await screen.findByText(/ลิงก์นี้หมดอายุหรือถูกใช้ไปแล้ว/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/รหัสผ่านใหม่/)).not.toBeInTheDocument();
  });

  it("says it is saving while the new password is in flight", async () => {
    const user = userEvent.setup();
    updateUser.mockReturnValue(new Promise(() => {}));

    render(<ResetPasswordPage />);
    await fillAndSubmit(user);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /กำลังบันทึก/ })).toBeDisabled()
    );
  });

  // FR-012b again: this ends in a page load, so reopening the button on success
  // would leave it clickable over the whole span before the next screen.
  it("stays busy after a successful save, through the navigation", async () => {
    const user = userEvent.setup();
    updateUser.mockResolvedValue({ error: null });

    render(<ResetPasswordPage />);
    await fillAndSubmit(user);

    await waitFor(() => expect(window.location.assign).toHaveBeenCalledWith("/photos"));
    expect(screen.getByRole("button", { name: /กำลังบันทึก/ })).toBeDisabled();
  });

  it("frees the button and shows the reason when the save is rejected", async () => {
    const user = userEvent.setup();
    updateUser.mockResolvedValue({ error: { message: "Password is too weak" } });

    render(<ResetPasswordPage />);
    await fillAndSubmit(user);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "บันทึกรหัสผ่าน" })).toBeEnabled()
    );
    expect(screen.getByText("Password is too weak")).toBeInTheDocument();
  });

  it("refuses a password the rules reject without ever calling the server", async () => {
    const user = userEvent.setup();

    render(<ResetPasswordPage />);
    await user.type(await screen.findByPlaceholderText(/รหัสผ่านใหม่/), "short");
    await user.click(screen.getByRole("button", { name: "บันทึกรหัสผ่าน" }));

    expect(updateUser).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "บันทึกรหัสผ่าน" })).toBeEnabled();
  });
});
