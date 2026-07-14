"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient, getUserRole, requireRole, requireUser } from "@/lib/supabase/server";
import type { Role } from "@/lib/roles";
import type { Account, ActionResult, RoleRequest } from "@/lib/types";

async function assertIsAdmin(): Promise<string | null> {
  try {
    await requireRole("admin");
    return null;
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return "กรุณาเข้าสู่ระบบก่อนทำรายการนี้";
    }
    return "คุณไม่มีสิทธิ์ทำรายการนี้";
  }
}

export async function listAccounts(): Promise<ActionResult<Account[]>> {
  const authError = await assertIsAdmin();
  if (authError) return { ok: false, error: authError };

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .order("created_at", { ascending: true });

  if (error || !data) {
    return { ok: false, error: error?.message ?? "โหลดรายชื่อผู้ใช้ไม่สำเร็จ" };
  }

  return { ok: true, data: data as Account[] };
}

// Exact-match check, not requireRole()'s "at least" semantics — an editor
// or admin requesting editor access should be rejected too, since they
// already have that capability or more (specs/008-role-requests-search
// FR-004, research.md Decision 7).
async function assertIsViewer(): Promise<{ id: string } | string> {
  let userId: string;
  try {
    const user = await requireUser();
    userId = user?.id ?? "dev";
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return "กรุณาเข้าสู่ระบบก่อนทำรายการนี้";
    }
    return "คุณไม่มีสิทธิ์ทำรายการนี้";
  }

  const role = await getUserRole(userId);
  if (role !== "viewer") {
    return "คุณมีสิทธิ์นี้อยู่แล้ว";
  }

  return { id: userId };
}

export async function requestEditorAccess(): Promise<ActionResult<{ requestId: string }>> {
  const viewer = await assertIsViewer();
  if (typeof viewer === "string") return { ok: false, error: viewer };

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("role_requests")
    .insert({ requester_id: viewer.id })
    .select("id")
    .single();

  if (error || !data) {
    // Unique violation from role_requests_one_pending_per_requester
    // (research.md Decision 1) — Postgres error code 23505.
    if (error?.code === "23505") {
      return { ok: false, error: "คุณมีคำขอที่รอดำเนินการอยู่แล้ว" };
    }
    return { ok: false, error: error?.message ?? "ส่งคำขอไม่สำเร็จ" };
  }

  revalidatePath("/admin/users");
  revalidatePath("/photos");

  return { ok: true, data: { requestId: data.id } };
}

export async function listPendingRoleRequests(): Promise<ActionResult<RoleRequest[]>> {
  const authError = await assertIsAdmin();
  if (authError) return { ok: false, error: authError };

  const supabase = createServiceClient();
  // "!requester_id" disambiguates which FK to embed on — role_requests
  // has two (requester_id, resolved_by), both pointing at profiles.
  const { data, error } = await supabase
    .from("role_requests")
    .select("id, requester_id, requested_at, profiles!requester_id(email, full_name)")
    .eq("status", "pending")
    .order("requested_at", { ascending: true });

  if (error || !data) {
    return { ok: false, error: error?.message ?? "โหลดคำขอไม่สำเร็จ" };
  }

  const requests: RoleRequest[] = data.map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      requesterId: row.requester_id,
      requesterEmail: profile?.email ?? "",
      requesterFullName: profile?.full_name ?? null,
      status: "pending",
      requestedAt: row.requested_at,
    };
  });

  return { ok: true, data: requests };
}

async function resolveRoleRequest(
  requestId: string,
  status: "approved" | "denied"
): Promise<ActionResult<{ requestId: string }> | { admin: { id: string } }> {
  let admin: { id: string };
  try {
    admin = await requireRole("admin");
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return { ok: false, error: "กรุณาเข้าสู่ระบบก่อนทำรายการนี้" };
    }
    return { ok: false, error: "คุณไม่มีสิทธิ์ทำรายการนี้" };
  }

  const supabase = createServiceClient();

  // Atomic conditional update — only matches a row still "pending," so a
  // request another admin already resolved a moment ago updates zero rows
  // instead of being double-processed (research.md Decision 6).
  const { data, error } = await supabase
    .from("role_requests")
    .update({ status, resolved_at: new Date().toISOString(), resolved_by: admin.id })
    .eq("id", requestId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, error: "คำขอนี้ถูกดำเนินการไปแล้ว" };
  }

  return { admin };
}

export async function approveRoleRequest(
  requestId: string
): Promise<ActionResult<{ requestId: string }>> {
  const result = await resolveRoleRequest(requestId, "approved");
  if ("ok" in result) return result;

  const supabase = createServiceClient();

  const { data: request, error: fetchError } = await supabase
    .from("role_requests")
    .select("requester_id")
    .eq("id", requestId)
    .single();

  if (fetchError || !request) {
    return { ok: false, error: fetchError?.message ?? "ไม่พบคำขอนี้" };
  }

  // Scoped to role = 'viewer' so this is a harmless no-op (not a
  // demotion) if the requester was already promoted some other way while
  // the request sat pending (research.md Decision 5).
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: "editor" })
    .eq("id", request.requester_id)
    .eq("role", "viewer");

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  revalidatePath("/admin/users");

  return { ok: true, data: { requestId } };
}

export async function denyRoleRequest(
  requestId: string
): Promise<ActionResult<{ requestId: string }>> {
  const result = await resolveRoleRequest(requestId, "denied");
  if ("ok" in result) return result;

  revalidatePath("/admin/users");

  return { ok: true, data: { requestId } };
}

export async function updateUserRole(
  accountId: string,
  newRole: Role
): Promise<ActionResult<{ accountId: string; role: Role }>> {
  const authError = await assertIsAdmin();
  if (authError) return { ok: false, error: authError };

  const supabase = createServiceClient();

  const { data: target, error: fetchError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", accountId)
    .single();

  if (fetchError || !target) {
    return { ok: false, error: "ไม่พบบัญชีนี้" };
  }

  // Never let the last admin be demoted — otherwise nobody could reach this
  // screen again to fix it (FR-012, research.md Decision 6).
  if (target.role === "admin" && newRole !== "admin") {
    const { count, error: countError } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .neq("id", accountId);

    if (countError) {
      return { ok: false, error: countError.message };
    }
    if (!count) {
      return { ok: false, error: "ต้องมีผู้ดูแลระบบอย่างน้อย 1 คนเสมอ ไม่สามารถเปลี่ยนสิทธิ์นี้ได้" };
    }
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", accountId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  revalidatePath("/admin/users");

  return { ok: true, data: { accountId, role: newRole } };
}
