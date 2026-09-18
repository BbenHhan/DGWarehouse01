import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  LOCAL_BASE_DIR,
  localAddRequirement,
  localCreateDocumentCategory,
  localCreateDocumentGroup,
  localDeleteDocumentCategory,
  localDeleteDocumentGroup,
  localDeleteRequirement,
  localGetDocumentCategories,
  localGetDocumentGroups,
  localGetGroupRequirements,
  localMoveRequirement,
  localSetCategoryDescription,
  localSetGroupDescription,
  localUpdateRequirement,
} from "@/lib/local/store";

// specs/046-subgroup-requirement-checklist — the local backend's half of the
// contract (Constitution III). The Server Action tests exercise the same paths
// through the rights gate; these pin the store's own behaviour.

let run: number;
beforeEach(() => {
  run = Math.floor(Math.random() * 1_000_000);
});

let seeded = 0;
async function seed() {
  // Category names are unique, so every call gets its own.
  seeded += 1;
  const category = await localCreateDocumentCategory(`หมวดรายการ ${run}-${seeded}`, "📋");
  if (!category) throw new Error("could not seed category");
  const group = await localCreateDocumentGroup(category.id, `หมวดย่อย ${run}`);
  if (!group) throw new Error("could not seed group");
  return { category, group };
}

async function add(groupId: string, nameTh: string) {
  const item = await localAddRequirement({ groupId, nameTh, status: "missing", note: null });
  if (!item) throw new Error(`could not add ${nameTh}`);
  return item;
}

describe("adding and reading items", () => {
  it("appends each item after the ones already there", async () => {
    const { category, group } = await seed();
    await add(group.id, "หนึ่ง");
    await add(group.id, "สอง");
    await add(group.id, "สาม");

    const items = (await localGetGroupRequirements(category.id))[group.id];
    expect(items.map((item) => [item.name_th, item.sort_order])).toEqual([
      ["หนึ่ง", 1],
      ["สอง", 2],
      ["สาม", 3],
    ]);
  });

  it("keeps a new item marked missing unless told otherwise", async () => {
    const { group } = await seed();
    expect((await add(group.id, "ใบรับรอง")).status).toBe("missing");
  });

  it("refuses an item for a sub-group that does not exist", async () => {
    expect(
      await localAddRequirement({ groupId: crypto.randomUUID(), nameTh: "x", status: "missing", note: null })
    ).toBeNull();
  });

  it("only returns items for the category asked about", async () => {
    const a = await seed();
    const b = await seed();
    await add(a.group.id, "ของ a");
    await add(b.group.id, "ของ b");

    const forA = await localGetGroupRequirements(a.category.id);
    expect(Object.keys(forA)).toEqual([a.group.id]);
  });

  it("leaves sub-groups with no items out of the result", async () => {
    const { category, group } = await seed();
    expect((await localGetGroupRequirements(category.id))[group.id]).toBeUndefined();
  });
});

describe("changing an item", () => {
  it("updates name, status and note, each on its own", async () => {
    const { category, group } = await seed();
    const item = await add(group.id, "เดิม");

    await localUpdateRequirement(item.id, { status: "have" });
    await localUpdateRequirement(item.id, { note: "ไฟล์ ES-cert.pdf" });
    await localUpdateRequirement(item.id, { nameTh: "ใหม่" });

    const [stored] = (await localGetGroupRequirements(category.id))[group.id];
    expect(stored).toMatchObject({ name_th: "ใหม่", status: "have", note: "ไฟล์ ES-cert.pdf" });
  });

  it("clears a note when given null", async () => {
    const { category, group } = await seed();
    const item = await localAddRequirement({ groupId: group.id, nameTh: "x", status: "waiting", note: "รอสายล่อฟ้า" });
    await localUpdateRequirement(item!.id, { note: null });
    expect((await localGetGroupRequirements(category.id))[group.id][0].note).toBeNull();
  });

  it("reports an unknown item as not found", async () => {
    expect(await localUpdateRequirement(crypto.randomUUID(), { status: "have" })).toBeNull();
  });
});

describe("deleting and reordering", () => {
  it("closes the gap after a delete", async () => {
    const { category, group } = await seed();
    await add(group.id, "หนึ่ง");
    const middle = await add(group.id, "สอง");
    await add(group.id, "สาม");

    await localDeleteRequirement(middle.id);

    const items = (await localGetGroupRequirements(category.id))[group.id];
    expect(items.map((item) => [item.name_th, item.sort_order])).toEqual([
      ["หนึ่ง", 1],
      ["สาม", 2],
    ]);
  });

  it("swaps with the neighbour and keeps the order contiguous", async () => {
    const { category, group } = await seed();
    await add(group.id, "หนึ่ง");
    const second = await add(group.id, "สอง");
    await add(group.id, "สาม");

    await localMoveRequirement(second.id, "up");

    const items = (await localGetGroupRequirements(category.id))[group.id];
    expect(items.map((item) => item.name_th)).toEqual(["สอง", "หนึ่ง", "สาม"]);
    expect(items.map((item) => item.sort_order)).toEqual([1, 2, 3]);
  });

  it("will not move the first item up or the last item down", async () => {
    const { group } = await seed();
    const first = await add(group.id, "หนึ่ง");
    const last = await add(group.id, "สอง");

    expect(await localMoveRequirement(first.id, "up")).toBe("edge");
    expect(await localMoveRequirement(last.id, "down")).toBe("edge");
  });
});

describe("items go with their sub-group (FR-015)", () => {
  it("removes a deleted sub-group's items and nobody else's", async () => {
    const { category, group } = await seed();
    const other = await localCreateDocumentGroup(category.id, `อีกหมวด ${run}`);
    await add(group.id, "ของที่จะหายไป");
    await add(other!.id, "ของที่ต้องอยู่");

    expect(await localDeleteDocumentGroup(group.id)).not.toBeNull();

    const remaining = await localGetGroupRequirements(category.id);
    expect(Object.keys(remaining)).toEqual([other!.id]);
    expect(remaining[other!.id].map((item) => item.name_th)).toEqual(["ของที่ต้องอยู่"]);

    // The read above only looks at sub-groups that still exist, so it would hide
    // an orphaned row. Check what is actually stored.
    const raw = JSON.parse(await readFile(path.join(LOCAL_BASE_DIR, "db.json"), "utf-8"));
    expect(raw.groupRequirements.some((row: { group_id: string }) => row.group_id === group.id)).toBe(false);
  });

  it("removes the items of every sub-group in a deleted category", async () => {
    const { category, group } = await seed();
    const item = await add(group.id, "ในหมวดที่จะลบ");

    expect(await localDeleteDocumentCategory(category.id)).not.toBeNull();

    const raw = JSON.parse(await readFile(path.join(LOCAL_BASE_DIR, "db.json"), "utf-8"));
    expect(raw.groupRequirements.some((row: { id: string }) => row.id === item.id)).toBe(false);
  });
});

describe("descriptions", () => {
  it("sets and clears a sub-group's description", async () => {
    const { category, group } = await seed();
    await localSetGroupDescription(group.id, "ใบรับรองของวัสดุที่ติดตั้งจริง");
    expect((await localGetDocumentGroups(category.id))[0].description).toBe("ใบรับรองของวัสดุที่ติดตั้งจริง");

    await localSetGroupDescription(group.id, null);
    expect((await localGetDocumentGroups(category.id))[0].description).toBeNull();
  });

  it("sets a category's description", async () => {
    const { category } = await seed();
    await localSetCategoryDescription(category.id, "ชุดเอกสารยื่นขออนุญาต");
    const stored = (await localGetDocumentCategories()).find((candidate) => candidate.id === category.id);
    expect(stored?.description).toBe("ชุดเอกสารยื่นขออนุญาต");
  });

  it("reports unknown targets as not found", async () => {
    expect(await localSetGroupDescription(crypto.randomUUID(), "x")).toBeNull();
    expect(await localSetCategoryDescription(`ไม่มี-${run}`, "x")).toBeNull();
  });
});

describe("a db.json from before this feature", () => {
  it("reads as having no items rather than failing", async () => {
    const { category } = await seed();
    const dbPath = path.join(LOCAL_BASE_DIR, "db.json");
    const raw = JSON.parse(await readFile(dbPath, "utf-8"));
    delete raw.groupRequirements;
    await writeFile(dbPath, JSON.stringify(raw));

    expect(await localGetGroupRequirements(category.id)).toEqual({});
  });
});
