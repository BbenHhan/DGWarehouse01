import { describe, expect, it, vi } from "vitest";
import { createSupabaseStub, type StubResult } from "@/lib/supabase-stub";

// specs/046-subgroup-requirement-checklist research Decision 4 / quickstart
// Scenario 0. Migration 0015 is pasted into the SQL Editor by hand, so the code
// can reach production first. These pin what the live project was observed to
// return in that window — PGRST205 for the missing table, PGRST204 for a missing
// column — and what the app must do with each.

vi.mock("@/lib/data-config", () => ({ DATA_SOURCE: "supabase", USE_MOCK_DATA: false }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const tables: Record<string, StubResult> = {};
vi.mock("@/lib/supabase/server", () => ({
  requireUser: vi.fn(async () => ({ id: "u1" })),
  requireRole: vi.fn(async () => ({ role: "editor" })),
  createServiceClient: () => createSupabaseStub({ tables }).client,
}));

const MISSING_TABLE = {
  code: "PGRST205",
  message: "Could not find the table 'public.document_group_requirements' in the schema cache",
};
const MISSING_COLUMN = {
  code: "PGRST204",
  message: "Could not find the 'description' column of 'document_groups' in the schema cache",
};

describe("before migration 0015 is applied", () => {
  it("reads as no requirements instead of breaking the category page", async () => {
    tables.document_group_requirements = { data: null, error: MISSING_TABLE };
    const { getGroupRequirements } = await import("@/lib/data");
    await expect(getGroupRequirements("cat-6")).resolves.toEqual({});
  });

  it("still surfaces any other read error", async () => {
    tables.document_group_requirements = { data: null, error: { code: "08006", message: "connection failure" } };
    const { getGroupRequirements } = await import("@/lib/data");
    await expect(getGroupRequirements("cat-6")).rejects.toMatchObject({ code: "08006" });
  });

  it("says in Thai that the checklist is not enabled yet when an item is added", async () => {
    tables.document_groups = { data: { id: "g1" }, error: null };
    tables.document_group_requirements = { data: null, error: MISSING_TABLE };
    const { addRequirement } = await import("@/app/actions/group-requirements");

    const result = await addRequirement({ groupId: crypto.randomUUID(), nameTh: "ใบรับรอง" });
    expect(result).toEqual({ ok: false, error: "ยังไม่ได้เปิดใช้รายการเอกสารที่ต้องมี (ต้องรัน migration 0015 ก่อน)" });
  });

  it("says the same when a description is written to a column that does not exist yet", async () => {
    tables.document_groups = { data: null, error: MISSING_COLUMN };
    const { setGroupDescription } = await import("@/app/actions/group-requirements");

    const result = await setGroupDescription({ groupId: crypto.randomUUID(), description: "x" });
    expect(result).toEqual({ ok: false, error: "ยังไม่ได้เปิดใช้รายการเอกสารที่ต้องมี (ต้องรัน migration 0015 ก่อน)" });
  });

  it("reports an ordinary write failure as itself, not as a missing migration", async () => {
    tables.document_groups = { data: null, error: { code: "23514", message: "violates check constraint" } };
    const { setGroupDescription } = await import("@/app/actions/group-requirements");

    const result = await setGroupDescription({ groupId: crypto.randomUUID(), description: "x" });
    expect(result).toEqual({ ok: false, error: "violates check constraint" });
  });
});
