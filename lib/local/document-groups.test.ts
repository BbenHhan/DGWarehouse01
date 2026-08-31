import { beforeEach, describe, expect, it } from "vitest";
import {
  localCreateDocumentGroup,
  localGetDocumentCategories,
  localRenameDocumentCategory,
  localDeleteDocumentGroup,
  localGetDocumentGroups,
  localMoveDocumentGroup,
  localRenameDocumentGroup,
  localResolveDocumentGroup,
  localSaveDocumentFile,
  localGetAllDocumentGroups,
  localGetDocuments,
  localUpdateDocument,
} from "@/lib/local/store";

// vitest.setup.ts points the local store at a disposable temp directory for the
// whole run. Groups are scoped by category, so each test mints its own category
// ids and is isolated by construction — no text-prefix filtering needed here.
let testId: number;

beforeEach(() => {
  testId = Math.floor(Math.random() * 1_000_000);
});

function categories() {
  return { catA: `test-cat-a-${testId}`, catB: `test-cat-b-${testId}` };
}

function file(name = "doc.pdf") {
  return new File(["x"], name, { type: "application/pdf" });
}

describe("localCreateDocumentGroup", () => {
  it("creates a group in a category holding no documents at all", async () => {
    const { catA } = categories();
    const group = await localCreateDocumentGroup(catA, "4.1 ป้ายสัญลักษณ์ความปลอดภัย");

    expect(group?.name_th).toBe("4.1 ป้ายสัญลักษณ์ความปลอดภัย");
    expect(group?.document_count).toBe(0);
    expect(await localGetDocumentGroups(catA)).toHaveLength(1);
  });

  it("refuses a name already used in the same category", async () => {
    const { catA } = categories();
    await localCreateDocumentGroup(catA, "งานพื้น");

    expect(await localCreateDocumentGroup(catA, "งานพื้น")).toBeNull();
    expect(await localGetDocumentGroups(catA)).toHaveLength(1);
  });

  it("allows the same name under a different category", async () => {
    const { catA, catB } = categories();
    await localCreateDocumentGroup(catA, "แปลน");

    expect(await localCreateDocumentGroup(catB, "แปลน")).not.toBeNull();
  });

  it("appends each new group after the last", async () => {
    const { catA } = categories();
    await localCreateDocumentGroup(catA, "หนึ่ง");
    await localCreateDocumentGroup(catA, "สอง");
    await localCreateDocumentGroup(catA, "สาม");

    expect((await localGetDocumentGroups(catA)).map((g) => g.name_th)).toEqual(["หนึ่ง", "สอง", "สาม"]);
  });
});

describe("localGetDocumentGroups", () => {
  it("returns only that category's groups", async () => {
    const { catA, catB } = categories();
    await localCreateDocumentGroup(catA, "ของ A");
    await localCreateDocumentGroup(catB, "ของ B");

    expect((await localGetDocumentGroups(catA)).map((g) => g.name_th)).toEqual(["ของ A"]);
  });

  it("counts the documents in each group", async () => {
    const { catA } = categories();
    const group = await localCreateDocumentGroup(catA, "มีไฟล์");
    await localCreateDocumentGroup(catA, "ว่าง");
    await localSaveDocumentFile(catA, group!.id, file("a.pdf"));
    await localSaveDocumentFile(catA, group!.id, file("b.pdf"));

    const groups = await localGetDocumentGroups(catA);
    expect(groups.find((g) => g.name_th === "มีไฟล์")?.document_count).toBe(2);
    expect(groups.find((g) => g.name_th === "ว่าง")?.document_count).toBe(0);
  });

  it("still lists a group that holds nothing — the whole point of the feature", async () => {
    const { catA } = categories();
    await localCreateDocumentGroup(catA, "ยังไม่มีไฟล์");

    expect(await localGetDocumentGroups(catA)).toHaveLength(1);
  });
});

describe("localRenameDocumentGroup", () => {
  it("renames without touching the documents in it", async () => {
    const { catA } = categories();
    const group = await localCreateDocumentGroup(catA, "ชื่อเดิม");
    await localSaveDocumentFile(catA, group!.id, file());

    const renamed = await localRenameDocumentGroup(group!.id, "ชื่อใหม่");

    expect(renamed?.name_th).toBe("ชื่อใหม่");
    const groups = await localGetDocumentGroups(catA);
    expect(groups[0].name_th).toBe("ชื่อใหม่");
    expect(groups[0].document_count).toBe(1);
  });

  it("refuses a name a sibling already uses", async () => {
    const { catA } = categories();
    await localCreateDocumentGroup(catA, "หนึ่ง");
    const second = await localCreateDocumentGroup(catA, "สอง");

    expect(await localRenameDocumentGroup(second!.id, "หนึ่ง")).toBeNull();
  });

  it("returns null for an id that isn't in the store", async () => {
    expect(await localRenameDocumentGroup("no-such-id", "x")).toBeNull();
  });
});

describe("localMoveDocumentGroup", () => {
  it("swaps with the neighbour above and renumbers contiguously", async () => {
    const { catA } = categories();
    await localCreateDocumentGroup(catA, "หนึ่ง");
    const second = await localCreateDocumentGroup(catA, "สอง");
    await localCreateDocumentGroup(catA, "สาม");

    await localMoveDocumentGroup(second!.id, "up");

    const groups = await localGetDocumentGroups(catA);
    expect(groups.map((g) => g.name_th)).toEqual(["สอง", "หนึ่ง", "สาม"]);
    expect(groups.map((g) => g.sort_order)).toEqual([1, 2, 3]);
  });

  it("refuses to move the first row up or the last row down", async () => {
    const { catA } = categories();
    const first = await localCreateDocumentGroup(catA, "หนึ่ง");
    const last = await localCreateDocumentGroup(catA, "สอง");

    expect(await localMoveDocumentGroup(first!.id, "up")).toBeNull();
    expect(await localMoveDocumentGroup(last!.id, "down")).toBeNull();
    expect((await localGetDocumentGroups(catA)).map((g) => g.name_th)).toEqual(["หนึ่ง", "สอง"]);
  });

  it("never reorders another category's groups", async () => {
    const { catA, catB } = categories();
    await localCreateDocumentGroup(catB, "บี 1");
    await localCreateDocumentGroup(catB, "บี 2");
    await localCreateDocumentGroup(catA, "เอ 1");
    const a2 = await localCreateDocumentGroup(catA, "เอ 2");

    await localMoveDocumentGroup(a2!.id, "up");

    expect((await localGetDocumentGroups(catB)).map((g) => g.name_th)).toEqual(["บี 1", "บี 2"]);
  });
});

describe("localDeleteDocumentGroup", () => {
  it("deletes a group holding nothing and closes the ordering gap", async () => {
    const { catA } = categories();
    await localCreateDocumentGroup(catA, "หนึ่ง");
    const second = await localCreateDocumentGroup(catA, "สอง");
    await localCreateDocumentGroup(catA, "สาม");

    await localDeleteDocumentGroup(second!.id);

    const groups = await localGetDocumentGroups(catA);
    expect(groups.map((g) => g.name_th)).toEqual(["หนึ่ง", "สาม"]);
    expect(groups.map((g) => g.sort_order)).toEqual([1, 2]);
  });

  it("refuses while documents still point at it — the caller must move or delete them first", async () => {
    const { catA } = categories();
    const group = await localCreateDocumentGroup(catA, "มีไฟล์");
    await localSaveDocumentFile(catA, group!.id, file());

    expect(await localDeleteDocumentGroup(group!.id)).toBeNull();
    expect(await localGetDocumentGroups(catA)).toHaveLength(1);
  });

  it("returns null for an id that isn't in the store", async () => {
    expect(await localDeleteDocumentGroup("no-such-id")).toBeNull();
  });
});

describe("localResolveDocumentGroup", () => {
  it("reuses an existing group with that name", async () => {
    const { catA } = categories();
    const group = await localCreateDocumentGroup(catA, "แปลน");

    expect(await localResolveDocumentGroup(catA, "แปลน")).toBe(group!.id);
    expect(await localGetDocumentGroups(catA)).toHaveLength(1);
  });

  it("creates the group when the category has never seen the name", async () => {
    const { catA } = categories();
    const id = await localResolveDocumentGroup(catA, "ของใหม่");

    expect(id).not.toBeNull();
    expect((await localGetDocumentGroups(catA)).map((g) => g.name_th)).toEqual(["ของใหม่"]);
  });

  it("treats blank and whitespace-only as no group at all", async () => {
    const { catA } = categories();

    expect(await localResolveDocumentGroup(catA, "")).toBeNull();
    expect(await localResolveDocumentGroup(catA, "   ")).toBeNull();
    expect(await localResolveDocumentGroup(catA, null)).toBeNull();
    expect(await localGetDocumentGroups(catA)).toHaveLength(0);
  });

  it("trims the name before matching, so ' แปลน ' finds 'แปลน'", async () => {
    const { catA } = categories();
    const group = await localCreateDocumentGroup(catA, "แปลน");

    expect(await localResolveDocumentGroup(catA, "  แปลน  ")).toBe(group!.id);
  });
});

describe("localRenameDocumentCategory", () => {
  it("renames a category without touching its slug — the slug is a live URL", async () => {
    const before = (await localGetDocumentCategories()).find((c) => c.slug === "structure");
    const renamed = await localRenameDocumentCategory(before!.id, { nameTh: "หมวดที่ 1 โครงสร้างและสถาปัตยกรรม" });

    expect(renamed?.name_th).toBe("หมวดที่ 1 โครงสร้างและสถาปัตยกรรม");
    expect(renamed?.slug).toBe("structure");

    // restore, so later tests see the seeded name
    await localRenameDocumentCategory(before!.id, { nameTh: before!.name_th });
  });

  it("changes the icon on its own", async () => {
    const category = (await localGetDocumentCategories()).find((c) => c.slug === "safety");
    const renamed = await localRenameDocumentCategory(category!.id, { emoji: "🧯" });

    expect(renamed?.emoji).toBe("🧯");
    expect(renamed?.name_th).toBe(category!.name_th);

    await localRenameDocumentCategory(category!.id, { emoji: category!.emoji });
  });

  it("returns null for an id that isn't in the store", async () => {
    expect(await localRenameDocumentCategory("no-such-id", { nameTh: "x" })).toBeNull();
  });

  it("seeds the four real categories on a fresh store, in order", async () => {
    const categories = await localGetDocumentCategories();
    expect(categories.map((c) => c.slug)).toEqual(["structure", "electrical", "environment", "safety"]);
    expect(categories.map((c) => c.sort_order)).toEqual([1, 2, 3, 4]);
  });
});

describe("moving documents between groups", () => {
  it("moves a document into another category's group, updating both counts", async () => {
    const { catA, catB } = categories();
    const from = await localCreateDocumentGroup(catA, "ต้นทาง");
    const to = await localCreateDocumentGroup(catB, "ปลายทาง");
    const doc = await localSaveDocumentFile(catA, from!.id, file());

    await localUpdateDocument(doc.id, { categoryId: catB, groupId: to!.id });

    expect((await localGetDocumentGroups(catA))[0].document_count).toBe(0);
    expect((await localGetDocumentGroups(catB))[0].document_count).toBe(1);
    expect((await localGetDocuments(catB)).map((d) => d.id)).toContain(doc.id);
  });

  it("moves a document out of every group when the destination is none", async () => {
    const { catA } = categories();
    const group = await localCreateDocumentGroup(catA, "มีกลุ่ม");
    const doc = await localSaveDocumentFile(catA, group!.id, file());

    await localUpdateDocument(doc.id, { groupId: null });

    expect((await localGetDocumentGroups(catA))[0].document_count).toBe(0);
    const moved = (await localGetDocuments(catA)).find((d) => d.id === doc.id);
    expect(moved?.group_id).toBeNull();
  });

  it("never rewrites storage_path — a move is metadata only, so no file is re-keyed", async () => {
    const { catA, catB } = categories();
    const group = await localCreateDocumentGroup(catA, "ต้นทาง");
    const doc = await localSaveDocumentFile(catA, group!.id, file("แปลนอาคาร.pdf"));
    const originalPath = doc.storage_path;

    await localUpdateDocument(doc.id, { categoryId: catB, groupId: null });

    const moved = (await localGetDocuments(catB)).find((d) => d.id === doc.id);
    expect(moved?.storage_path).toBe(originalPath);
  });

  it("frees a group to be deleted once its last document has moved out", async () => {
    const { catA } = categories();
    const group = await localCreateDocumentGroup(catA, "จะลบทีหลัง");
    const doc = await localSaveDocumentFile(catA, group!.id, file());

    expect(await localDeleteDocumentGroup(group!.id)).toBeNull();

    await localUpdateDocument(doc.id, { groupId: null });

    expect(await localDeleteDocumentGroup(group!.id)).not.toBeNull();
  });
});

describe("localGetAllDocumentGroups", () => {
  it("returns groups from every category, so the move picker can span them", async () => {
    const { catA, catB } = categories();
    await localCreateDocumentGroup(catA, "ของ A");
    await localCreateDocumentGroup(catB, "ของ B");

    const names = (await localGetAllDocumentGroups()).map((g) => g.name_th);
    expect(names).toContain("ของ A");
    expect(names).toContain("ของ B");
  });
});
