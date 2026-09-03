/** @vitest-environment jsdom */
import "../vitest.setup.dom";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RoleRequest } from "@/lib/types";

const approveRoleRequest = vi.fn();
const denyRoleRequest = vi.fn();
vi.mock("@/app/actions/users", () => ({
  approveRoleRequest: (...a: unknown[]) => approveRoleRequest(...a),
  denyRoleRequest: (...a: unknown[]) => denyRoleRequest(...a),
}));

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...a: unknown[]) => toastError(...a),
    success: (...a: unknown[]) => toastSuccess(...a),
  },
}));

const { PendingRequestsList } = await import("@/components/PendingRequestsList");

const REQUESTS: RoleRequest[] = [
  {
    id: "req-1",
    requesterId: "user-1",
    requesterEmail: "somchai@example.com",
    requesterFullName: "สมชาย ใจดี",
    requestedAt: "2026-09-01T03:00:00.000Z",
    status: "pending",
  },
  {
    id: "req-2",
    requesterId: "user-2",
    requesterEmail: "malee@example.com",
    requesterFullName: "มาลี สุขใจ",
    requestedAt: "2026-09-02T03:00:00.000Z",
    status: "pending",
  },
];

function buttonsForRow(name: string) {
  const row = screen.getByText(name).closest("li");
  if (!row) throw new Error(`no row for ${name}`);
  return {
    approve: row.querySelector("button:last-of-type") as HTMLButtonElement,
    deny: row.querySelector("button:first-of-type") as HTMLButtonElement,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("PendingRequestsList", () => {
  it("lists each pending request", () => {
    render(<PendingRequestsList requests={REQUESTS} />);
    expect(screen.getByText("สมชาย ใจดี")).toBeInTheDocument();
    expect(screen.getByText("มาลี สุขใจ")).toBeInTheDocument();
  });

  // FR-001, US1 scenario 4: the deny button used to only grey out while a
  // request was being resolved, saying nothing about why.
  it("marks both buttons of the row being resolved, and no other row", async () => {
    const user = userEvent.setup();
    approveRoleRequest.mockReturnValue(new Promise(() => {}));

    render(<PendingRequestsList requests={REQUESTS} />);
    await user.click(buttonsForRow("สมชาย ใจดี").approve);

    await waitFor(() => expect(buttonsForRow("สมชาย ใจดี").approve).toBeDisabled());
    expect(buttonsForRow("สมชาย ใจดี").deny).toBeDisabled();
    expect(buttonsForRow("มาลี สุขใจ").approve).toBeEnabled();
    expect(buttonsForRow("มาลี สุขใจ").deny).toBeEnabled();
  });

  // FR-003: a failure must return the row to a usable state rather than
  // leaving it permanently busy.
  it("frees the row again when the write fails", async () => {
    const user = userEvent.setup();
    approveRoleRequest.mockResolvedValue({ ok: false, error: "ไม่มีสิทธิ์" });

    render(<PendingRequestsList requests={REQUESTS} />);
    await user.click(buttonsForRow("สมชาย ใจดี").approve);

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("ไม่มีสิทธิ์"));
    expect(buttonsForRow("สมชาย ใจดี").approve).toBeEnabled();
    expect(screen.getByText("สมชาย ใจดี")).toBeInTheDocument();
  });

  it("removes the row once it is resolved", async () => {
    const user = userEvent.setup();
    denyRoleRequest.mockResolvedValue({ ok: true });

    render(<PendingRequestsList requests={REQUESTS} />);
    await user.click(buttonsForRow("สมชาย ใจดี").deny);

    await waitFor(() => expect(screen.queryByText("สมชาย ใจดี")).not.toBeInTheDocument());
    expect(screen.getByText("มาลี สุขใจ")).toBeInTheDocument();
  });
});
