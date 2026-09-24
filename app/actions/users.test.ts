import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseStub } from "@/lib/supabase-stub";

// specs/048-server-action-coverage, research Decision 4.
//
// These actions have no local backend — they always talk to the live database —
// so they run against a stand-in for it. The rules being proved live in the
// action, above the database: who may call, the last administrator, and a
// request acted on twice.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const requireRole = vi.fn();
const requireUser = vi.fn();
const getUserRole = vi.fn();
let stub = createSupabaseStub();
vi.mock("@/lib/supabase/server", () => ({
  requireRole: (...a: unknown[]) => requireRole(...a),
  requireUser: (...a: unknown[]) => requireUser(...a),
  getUserRole: (...a: unknown[]) => getUserRole(...a),
  createServiceClient: () => stub.client,
}));

const {
  listAccounts,
  listPendingRoleRequests,
  requestEditorAccess,
  approveRoleRequest,
  denyRoleRequest,
  updateUserRole,
} = await import("@/app/actions/users");

function refusal(result: { ok: boolean } & Record<string, unknown>): string {
  if (result.ok) throw new Error("expected the action to be refused, but it succeeded");
  return String(result.error ?? "");
}

beforeEach(() => {
  requireRole.mockReset();
  requireUser.mockReset();
  getUserRole.mockReset();
  requireRole.mockResolvedValue({ id: "admin-1", role: "admin" });
  requireUser.mockResolvedValue({ id: "viewer-1" });
  getUserRole.mockResolvedValue("viewer");
  stub = createSupabaseStub();
});

// ---------------------------------------------------------------------------
// US1 — accounts need an administrator, not merely an editor (FR-002)
// ---------------------------------------------------------------------------
describe("every account action requires an administrator", () => {
  const cases = () =>
    [
      ["listAccounts", () => listAccounts()],
      ["listPendingRoleRequests", () => listPendingRoleRequests()],
      ["approveRoleRequest", () => approveRoleRequest("req-1")],
      ["denyRoleRequest", () => denyRoleRequest("req-1")],
      ["updateUserRole", () => updateUserRole("account-1", "editor")],
    ] as const;

  // An editor may change every document in the app and still must not touch
  // anyone's role (Constitution VII).
  it("refuses an editor", async () => {
    requireRole.mockRejectedValue(new Error("FORBIDDEN"));

    for (const [, call] of cases()) {
      expect(refusal(await call())).toBe("คุณไม่มีสิทธิ์ทำรายการนี้");
    }
    expect(stub.calls).toEqual([]);
  });

  it("tells someone signed out to sign in, distinctly", async () => {
    requireRole.mockRejectedValue(new Error("UNAUTHENTICATED"));

    for (const [, call] of cases()) {
      expect(refusal(await call())).toBe("กรุณาเข้าสู่ระบบก่อนทำรายการนี้");
    }
    expect(stub.calls).toEqual([]);
  });

  it("asks for admin rights, not merely editor", async () => {
    stub = createSupabaseStub({ tables: { profiles: { data: [], error: null } } });
    await listAccounts();
    expect(requireRole).toHaveBeenCalledWith("admin");
  });
});

// ---------------------------------------------------------------------------
// US5 — the last administrator (FR-013)
// ---------------------------------------------------------------------------
describe("changing a role", () => {
  it("refuses to demote the only administrator, leaving the role unchanged", async () => {
    stub = createSupabaseStub({
      tables: {
        // the target is an admin, and counting the others finds none
        profiles: [{ data: { role: "admin" }, error: null }, { data: null, error: null, count: 0 }],
      },
    });

    const result = await updateUserRole("admin-1", "viewer");

    expect(refusal(result)).toBe("ต้องมีผู้ดูแลระบบอย่างน้อย 1 คนเสมอ ไม่สามารถเปลี่ยนสิทธิ์นี้ได้");
    // Nothing was written — otherwise nobody could reach this screen again.
    expect(stub.trail()).not.toContain("profiles.update");
  });

  it("allows demoting one administrator when another remains", async () => {
    stub = createSupabaseStub({
      tables: {
        profiles: [
          { data: { role: "admin" }, error: null },
          { data: null, error: null, count: 1 },
          { data: null, error: null },
        ],
      },
    });

    const result = await updateUserRole("admin-1", "editor");

    expect(result).toEqual({ ok: true, data: { accountId: "admin-1", role: "editor" } });
    expect(stub.trail()).toContain("profiles.update");
  });

  it("promotes a viewer without counting administrators at all", async () => {
    stub = createSupabaseStub({
      tables: { profiles: [{ data: { role: "viewer" }, error: null }, { data: null, error: null }] },
    });

    const result = await updateUserRole("viewer-1", "editor");

    expect(result).toEqual({ ok: true, data: { accountId: "viewer-1", role: "editor" } });
  });

  it("says so when the account does not exist", async () => {
    stub = createSupabaseStub({ tables: { profiles: { data: null, error: { message: "no rows" } } } });

    expect(refusal(await updateUserRole("ไม่มีบัญชีนี้", "editor"))).toBe("ไม่พบบัญชีนี้");
  });
});

// ---------------------------------------------------------------------------
// US5 — a request is handled exactly once (FR-014, FR-015)
// ---------------------------------------------------------------------------
describe("acting on a role request", () => {
  it("refuses a request that was already approved or denied", async () => {
    // The update only matches a row still pending, so an already-handled
    // request changes no rows and comes back empty.
    for (const act of [approveRoleRequest, denyRoleRequest]) {
      stub = createSupabaseStub({ tables: { role_requests: { data: null, error: null } } });
      expect(refusal(await act("req-1"))).toBe("คำขอนี้ถูกดำเนินการไปแล้ว");
      expect(stub.trail()).not.toContain("profiles.update");
    }
  });

  it("promotes the requester when approving a pending request", async () => {
    stub = createSupabaseStub({
      tables: {
        role_requests: [
          { data: { id: "req-1" }, error: null },
          { data: { requester_id: "viewer-1" }, error: null },
        ],
        profiles: { data: null, error: null },
      },
    });

    const result = await approveRoleRequest("req-1");

    expect(result).toEqual({ ok: true, data: { requestId: "req-1" } });
    expect(stub.trail()).toContain("profiles.update");
  });

  it("denies without touching anyone's role", async () => {
    stub = createSupabaseStub({ tables: { role_requests: { data: { id: "req-1" }, error: null } } });

    const result = await denyRoleRequest("req-1");

    expect(result).toEqual({ ok: true, data: { requestId: "req-1" } });
    expect(stub.trail()).not.toContain("profiles.update");
  });
});

describe("asking for editor access", () => {
  it("refuses a second request while one is pending, creating nothing", async () => {
    // 23505 is the unique constraint that allows one pending request per person.
    stub = createSupabaseStub({
      tables: { role_requests: { data: null, error: { code: "23505", message: "duplicate key" } } },
    });

    expect(refusal(await requestEditorAccess())).toBe("คุณมีคำขอที่รอดำเนินการอยู่แล้ว");
  });

  it("refuses someone who already has the rights they are asking for", async () => {
    getUserRole.mockResolvedValue("editor");

    expect(refusal(await requestEditorAccess())).toBe("คุณมีสิทธิ์นี้อยู่แล้ว");
    expect(stub.calls).toEqual([]);
  });

  it("creates the request for a viewer", async () => {
    stub = createSupabaseStub({ tables: { role_requests: { data: { id: "req-9" }, error: null } } });

    expect(await requestEditorAccess()).toEqual({ ok: true, data: { requestId: "req-9" } });
  });
});

describe("reading the lists", () => {
  it("returns the accounts an administrator asked for", async () => {
    const rows = [{ id: "u1", email: "a@example.com", full_name: null, role: "admin", created_at: "2026-01-01" }];
    stub = createSupabaseStub({ tables: { profiles: { data: rows, error: null } } });

    expect(await listAccounts()).toEqual({ ok: true, data: rows });
  });

  it("shapes a pending request with its requester's details", async () => {
    stub = createSupabaseStub({
      tables: {
        role_requests: {
          data: [
            {
              id: "req-1",
              requester_id: "viewer-1",
              requested_at: "2026-09-01",
              profiles: { email: "viewer@example.com", full_name: "ผู้ขอ" },
            },
          ],
          error: null,
        },
      },
    });

    expect(await listPendingRoleRequests()).toEqual({
      ok: true,
      data: [
        {
          id: "req-1",
          requesterId: "viewer-1",
          requesterEmail: "viewer@example.com",
          requesterFullName: "ผู้ขอ",
          status: "pending",
          requestedAt: "2026-09-01",
        },
      ],
    });
  });
});
