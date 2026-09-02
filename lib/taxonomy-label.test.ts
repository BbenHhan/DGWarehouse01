import { describe, expect, it } from "vitest";
import {
  categoryLabel,
  categoryNumber,
  groupLabel,
  groupNumber,
  stripCategoryNumber,
  stripGroupNumber,
} from "@/lib/taxonomy-label";

describe("numbers derived from position", () => {
  it("numbers a category from where it sits", () => {
    expect(categoryNumber({ sort_order: 4 })).toBe("หมวดที่ 4");
  });

  it("numbers a group as category.group", () => {
    expect(groupNumber({ sort_order: 3 }, 4)).toBe("4.3");
  });

  it("builds a full label from the stored name plus the derived number", () => {
    expect(categoryLabel({ sort_order: 2, name_th: "ระบบไฟฟ้า" })).toBe("หมวดที่ 2 ระบบไฟฟ้า");
    expect(groupLabel({ sort_order: 1, name_th: "งานพื้นอาคาร" }, 1)).toBe("1.1 งานพื้นอาคาร");
  });

  it("still shows something sane when the category is not to hand", () => {
    // Better a bare position than "undefined.3".
    expect(groupNumber({ sort_order: 3 }, undefined)).toBe("3");
  });

  it("renumbers by itself when a row moves", () => {
    // The whole point: the number follows the row, so reordering cannot leave
    // a group called "1.2" sitting third.
    const group = { sort_order: 2, name_th: "งานผนัง" };
    expect(groupLabel(group, 1)).toBe("1.2 งานผนัง");
    expect(groupLabel({ ...group, sort_order: 5 }, 1)).toBe("1.5 งานผนัง");
  });
});

describe("numbers typed into a name are dropped on the way in", () => {
  it.each([
    ["1.2 งานผนังและกำแพงกันไฟ", "งานผนังและกำแพงกันไฟ"],
    ["0. แปลนและแบบก่อสร้าง", "แปลนและแบบก่อสร้าง"],
    ["4.26 ใบอนุญาต", "ใบอนุญาต"],
    ["งานพื้นอาคาร", "งานพื้นอาคาร"],
  ])("strips %s", (input, expected) => {
    expect(stripGroupNumber(input)).toBe(expected);
  });

  it("strips a category's own numbering form", () => {
    expect(stripCategoryNumber("หมวดที่ 5 เอกสารสัญญาและจัดซื้อ")).toBe("เอกสารสัญญาและจัดซื้อ");
  });

  it("leaves a name that merely contains digits alone", () => {
    // "อาคาร 7" is part of the name, not a leading index.
    expect(stripGroupNumber("งานไฟฟ้า อาคาร 7")).toBe("งานไฟฟ้า อาคาร 7");
  });

  it("keeps a doubled number from ever being stored", () => {
    // Someone pastes the displayed label back in as a new name.
    expect(stripGroupNumber("1.2 1.2 งานผนัง")).toBe("1.2 งานผนัง");
  });
});
