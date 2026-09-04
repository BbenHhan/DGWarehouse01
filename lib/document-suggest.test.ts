import { describe, expect, it } from "vitest";
import { keywordsForGroup, suggestGroups } from "@/lib/document-suggest";
import type { DocumentCategory, DocumentGroup } from "@/lib/types";

const CATEGORIES: DocumentCategory[] = [
  { id: "c1", slug: "structure", name_th: "หมวดที่ 1 โครงสร้างอาคาร", emoji: "🏗️", sort_order: 1 },
  { id: "c2", slug: "electrical", name_th: "หมวดที่ 2 ระบบไฟฟ้า", emoji: "⚡", sort_order: 2 },
  { id: "c3", slug: "environment", name_th: "หมวดที่ 3 สิ่งแวดล้อม", emoji: "🌿", sort_order: 3 },
];

function group(id: string, categoryId: string, name: string, order: number): DocumentGroup {
  return { id, category_id: categoryId, name_th: name, sort_order: order, document_count: 0 };
}

// The account holder's real taxonomy, so the tests measure the real thing.
const GROUPS: DocumentGroup[] = [
  group("g0", "c1", "0. แปลนและแบบก่อสร้าง (Drawings & Plans)", 1),
  group("g1", "c1", "1.1 งานพื้นอาคาร (Flooring)", 2),
  group("g2", "c1", "1.2 งานผนังและกำแพงกันไฟ (Firewalls)", 3),
  group("g3", "c1", "1.3 งานหลังคาและการระบายอากาศ (Roofing & Ventilation)", 4),
  group("g4", "c1", "1.4 งานประตูและทางออกฉุกเฉิน (Doors & Emergency Exits)", 5),
  group("g5", "c2", "2.1 งานระบบไฟฟ้า แสงสว่าง และสายล่อฟ้า", 1),
  group("g6", "c3", "3.1 ระบบกักเก็บสารเคมีและน้ำดับเพลิง (Fire Water Retention)", 1),
];

function top(fileName: string, text?: string) {
  return suggestGroups({ fileName, text, groups: GROUPS, categories: CATEGORIES })[0];
}

describe("keywordsForGroup", () => {
  it("peels the number and the filler off a run-on Thai phrase", () => {
    // "1.1 งานพื้นอาคาร" -> "พื้น": the number goes, and so do the "งาน"
    // prefix and "อาคาร" suffix that appear in almost every group name and
    // would therefore match almost every file.
    const keywords = keywordsForGroup(GROUPS[1]);
    expect(keywords).toContain("พื้น");
    expect(keywords).not.toContain("1.1");
    expect(keywords).not.toContain("งานพื้นอาคาร");
  });

  it("keeps the English gloss, since some file names are in English", () => {
    expect(keywordsForGroup(GROUPS[1])).toContain("flooring");
  });

  it("adds vocabulary the group name never uses but real files do", () => {
    // "1.4 งานประตูและทางออกฉุกเฉิน" never says "ชัทเตอร์", but the account
    // holder's shutter certificate is filed there.
    expect(keywordsForGroup(GROUPS[4])).toContain("ชัทเตอร์");
  });
});

describe("suggesting from the file name", () => {
  it.each([
    ["แปลนห้องที่3.pdf", "g0"],
    ["แผนงานดัดแปลงอาคารREV.1.pdf", "g0"],
    ["เอกสาร ทนไฟประตูชัทเตอร์.pdf", "g4"],
    ["ASPรับรองบานเดี่ยว.pdf", "g4"],
    ["งานติดตั้งตู้ไฟพร้อมระบบป้องกันฟ้าฝ้า อาคาร 7.pdf", "g5"],
    ["คู่มือเก็บรักษาสารเคมีและวัตถุอันตราย ปี 2550.pdf", "g6"],
  ])("puts %s under the right group", (fileName, expectedGroupId) => {
    expect(top(fileName)?.group.id).toBe(expectedGroupId);
  });

  it("matches across the space-less Thai a file name actually uses", () => {
    // No separator between "ทนไฟ" and "ประตู" — substring matching is the point.
    expect(top("ทนไฟประตูชัทเตอร์.pdf")?.group.id).toBe("g4");
  });

  it("suggests nothing at all for a camera file name, rather than guessing", () => {
    expect(suggestGroups({ fileName: "IMG_9769.JPG", groups: GROUPS, categories: CATEGORIES })).toHaveLength(0);
    expect(suggestGroups({ fileName: "1770779379528.jpg", groups: GROUPS, categories: CATEGORIES })).toHaveLength(0);
  });

  it("names the words behind a suggestion, so it can be judged not just trusted", () => {
    expect(top("เอกสาร ทนไฟประตูชัทเตอร์.pdf")?.matched).toContain("ประตู");
  });

  it("carries the category, so the suggestion can say where it would go", () => {
    expect(top("แปลนห้องที่3.pdf")?.category?.name_th).toBe("หมวดที่ 1 โครงสร้างอาคาร");
  });
});

describe("suggesting from text pulled out of the file", () => {
  it("rescues a file whose name says nothing", () => {
    // This is the case that made scanning content worth doing at all.
    const suggestion = top("imgw-210162523.pdf", "รายงานผลการทดสอบการทนไฟของผนังยิปซั่ม");
    expect(suggestion?.group.id).toBe("g2");
  });

  it("lets a deliberate name outweigh a passing mention in the body", () => {
    // The body talks about doors; the name is about the roof. The name wins.
    const suggestion = top("งานหลังคาอาคาร 7.pdf", "ตรวจสอบประตูและทางออกฉุกเฉินโดยรอบ");
    expect(suggestion?.group.id).toBe("g3");
  });

  it("still suggests nothing when neither name nor text says anything useful", () => {
    expect(
      suggestGroups({ fileName: "IMG_9770.JPG", text: "   ", groups: GROUPS, categories: CATEGORIES })
    ).toHaveLength(0);
  });
});

describe("ranking", () => {
  it("returns at most three, best first", () => {
    const suggestions = suggestGroups({
      fileName: "แปลนงานพื้นและผนังกำแพงกันไฟ ประตู ไฟฟ้า.pdf",
      groups: GROUPS,
      categories: CATEGORIES,
    });
    expect(suggestions).toHaveLength(3);
    expect(suggestions[0].score).toBeGreaterThanOrEqual(suggestions[1].score);
  });

  it("breaks a tie by the order an editor set, not at random", () => {
    const suggestions = suggestGroups({
      fileName: "ผนัง ประตู.pdf",
      groups: GROUPS,
      categories: CATEGORIES,
    });
    const ids = suggestions.map((s) => s.group.id);
    expect(ids.indexOf("g2")).toBeLessThan(ids.indexOf("g4"));
  });
});
