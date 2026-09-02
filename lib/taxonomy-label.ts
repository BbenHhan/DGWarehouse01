import type { DocumentCategory, DocumentGroup } from "@/lib/types";

// Numbers are derived from position, never stored in the name
// (specs/040-editable-document-taxonomy follow-up).
//
// They used to be typed by hand, which stopped making sense the moment
// reordering existed: a group called "1.2" could be sitting third, and nothing
// kept the two in step. Deriving them means the number is always the truth
// about where the row actually is — and it means a person adding a topic types
// only its name.
//
// The trade the account holder accepted when choosing this: every existing
// number shifted once, because "0. แปลนและแบบก่อสร้าง" had been sitting first
// while numbered zero. It is "1.1" now, and everything after it moved up one.

export function categoryNumber(category: Pick<DocumentCategory, "sort_order">): string {
  return `หมวดที่ ${category.sort_order}`;
}

export function categoryLabel(category: Pick<DocumentCategory, "sort_order" | "name_th">): string {
  return `${categoryNumber(category)} ${category.name_th}`;
}

export function groupNumber(
  group: Pick<DocumentGroup, "sort_order">,
  categorySortOrder: number | undefined
): string {
  // A group whose category is not to hand still shows its own position rather
  // than a broken "undefined.3".
  return categorySortOrder === undefined ? `${group.sort_order}` : `${categorySortOrder}.${group.sort_order}`;
}

export function groupLabel(
  group: Pick<DocumentGroup, "sort_order" | "name_th">,
  categorySortOrder: number | undefined
): string {
  return `${groupNumber(group, categorySortOrder)} ${group.name_th}`;
}

// Removes a number someone typed at the front of a name, so the displayed
// number stays the derived one and never ends up doubled ("1.2 1.2 งานผนัง").
// Applied on the way in, not on the way out: what is stored is what a person
// meant to call the thing.
const LEADING_CATEGORY_NUMBER = /^หมวดที่\s*\d+\s*/;
const LEADING_GROUP_NUMBER = /^\d+(?:\.\d+)*\.?\s*/;

export function stripCategoryNumber(name: string): string {
  return name.replace(LEADING_CATEGORY_NUMBER, "").trim();
}

export function stripGroupNumber(name: string): string {
  return name.replace(LEADING_GROUP_NUMBER, "").trim();
}
