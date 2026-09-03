/** @vitest-environment jsdom */
import "../vitest.setup.dom";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Account } from "@/lib/types";

const updateUserRole = vi.fn();
vi.mock("@/app/actions/users", () => ({
  updateUserRole: (...a: unknown[]) => updateUserRole(...a),
}));

const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (...a: unknown[]) => toastError(...a) } }));

const { UserRoleTable } = await import("@/components/UserRoleTable");

const ACCOUNTS: Account[] = [
  {
    id: "u1",
    email: "somchai@example.com",
    full_name: "สมชาย ใจดี",
    role: "viewer",
    created_at: "2026-08-01T03:00:00.000Z",
  },
  {
    id: "u2",
    email: "malee@example.com",
    full_name: "มาลี สุขใจ",
    role: "editor",
    created_at: "2026-08-02T03:00:00.000Z",
  },
];

function roleControlFor(name: string) {
  const row = screen.getByText(name).closest("li");
  if (!row) throw new Error(`no row for ${name}`);
  return row.querySelector('[data-slot="select-trigger"]') as HTMLElement;
}

beforeEach(() => vi.clearAllMocks());

describe("UserRoleTable", () => {
  it("shows each account's current role", () => {
    render(<UserRoleTable accounts={ACCOUNTS} />);
    expect(roleControlFor("สมชาย ใจดี")).toHaveTextContent("ผู้ใช้งานทั่วไป");
    expect(roleControlFor("มาลี สุขใจ")).toHaveTextContent("ผู้แก้ไข");
  });

  // FR-004: only the row being written may look busy.
  it("marks only the row being written", async () => {
    const user = userEvent.setup();
    updateUserRole.mockReturnValue(new Promise(() => {}));

    render(<UserRoleTable accounts={ACCOUNTS} />);
    await user.click(roleControlFor("สมชาย ใจดี"));
    await user.click(await screen.findByRole("option", { name: "ผู้แก้ไข" }));

    await waitFor(() => expect(roleControlFor("สมชาย ใจดี")).toBeDisabled());
    expect(roleControlFor("มาลี สุขใจ")).toBeEnabled();
  });

  // FR-003: a rejected change must clear the busy state AND put the control
  // back to the role that is actually stored, not the one that was picked.
  it("restores the previous role and frees the control when the write fails", async () => {
    const user = userEvent.setup();
    updateUserRole.mockResolvedValue({ ok: false, error: "เปลี่ยนบทบาทไม่สำเร็จ" });

    render(<UserRoleTable accounts={ACCOUNTS} />);
    await user.click(roleControlFor("สมชาย ใจดี"));
    await user.click(await screen.findByRole("option", { name: "ผู้ดูแลระบบ" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("เปลี่ยนบทบาทไม่สำเร็จ"));
    expect(roleControlFor("สมชาย ใจดี")).toBeEnabled();
    expect(roleControlFor("สมชาย ใจดี")).toHaveTextContent("ผู้ใช้งานทั่วไป");
  });

  it("keeps the new role when the write succeeds", async () => {
    const user = userEvent.setup();
    updateUserRole.mockResolvedValue({ ok: true });

    render(<UserRoleTable accounts={ACCOUNTS} />);
    await user.click(roleControlFor("สมชาย ใจดี"));
    await user.click(await screen.findByRole("option", { name: "ผู้แก้ไข" }));

    await waitFor(() => expect(roleControlFor("สมชาย ใจดี")).toHaveTextContent("ผู้แก้ไข"));
  });
});
