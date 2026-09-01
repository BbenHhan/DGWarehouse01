import type { DocumentCategory, DocumentGroup } from "@/lib/types";

// Suggests which sub-group an unsorted file probably belongs to
// (specs/041 — filing assistance on the bulk upload page).
//
// Deliberately a suggestion, never an automatic filing. Measured against the
// account holder's own 33 filed documents, file names alone place about 40%
// correctly and misplace a few; a wrong guess that files itself in a folder
// bound for a Department of Industrial Works inspection costs far more than a
// click. So this ranks candidates and the person decides.
//
// Everything here is pure and offline. No file content leaves the browser.

export type Suggestion = {
  group: DocumentGroup;
  category: DocumentCategory | undefined;
  score: number;
  /** The words that caused the match, shown so a suggestion can be judged. */
  matched: string[];
};

// Thai is written without spaces, so matching is by substring rather than by
// tokenising — "ทนไฟประตูชัทเตอร์" has to match "ประตู" with nothing to split on.
const NOISE = ["งาน", "ระบบ", "การ", "และ", "ที่", "ของ", "เอกสาร", "หมวด", "ประเภท", "อาคาร", "ไฟล์"];

// Vocabulary the group names do not contain but the real documents use. Taken
// from the account holder's existing files: a shutter door is filed under
// doors, a fire-rating test under firewalls, a distribution board under
// electrical. Without these the matcher only finds names that already echo the
// group's own wording, which is the easy half.
const SYNONYMS: Record<string, string[]> = {
  ประตู: ["ชัทเตอร์", "shutter", "บานเดี่ยว", "บานคู่", "ทางหนีไฟ"],
  กำแพงกันไฟ: ["ทนไฟ", "gypsum", "ยิปซั่ม", "fire rating", "firewall"],
  ผนัง: ["ทนไฟ", "gypsum", "ยิปซั่ม"],
  ไฟฟ้า: ["ตู้ไฟ", "สายไฟ", "โคมไฟ", "หม้อแปลง", "เบรกเกอร์"],
  สายล่อฟ้า: ["ฟ้าผ่า", "ฟ้าฝ้า", "ล่อฟ้า", "lightning"],
  หลังคา: ["มุงหลังคา", "เมทัลชีท", "ฉนวน"],
  ระบายอากาศ: ["ลูกหมุน", "พัดลม", "ระบายความร้อน"],
  พื้น: ["คอนกรีต", "ขัดมัน", "อีพ็อกซี่", "epoxy"],
  แปลน: ["ผังบริเวณ", "แผนผัง", "แบบแปลน", "layout", "as-built"],
  แบบก่อสร้าง: ["แผนงาน", "ดัดแปลงอาคาร", "ก่อสร้าง"],
  สารเคมี: ["msds", "sds", "วัตถุอันตราย", "chemical"],
  ดับเพลิง: ["ถังดับเพลิง", "สปริงเกลอร์", "sprinkler", "hydrant", "หัวรับน้ำ"],
  ฝึกอบรม: ["อบรม", "training", "ใบประกาศ"],
  ตรวจสอบ: ["รายงานผล", "ใบรับรอง", "certificate", "รับรอง"],
  ปฐมพยาบาล: ["first aid", "เวชภัณฑ์"],
};

/** Meaningful fragments of a group's own name, plus any known synonyms. */
export function keywordsForGroup(group: DocumentGroup): string[] {
  // Strip the leading number ("1.2 "), then break on every separator the
  // account holder's names actually use — including "และ", which joins two
  // subjects inside one run-on Thai phrase.
  const withoutNumber = group.name_th.replace(/^[\d.]+\s*/, "");
  const parts = withoutNumber
    .split(/[()/,]|\s+|และ/)
    .map((part) => stripNoise(part.trim().toLowerCase()))
    .filter((part) => part.length >= 3);

  // Thai has no spaces, so a phrase like "งานพื้นอาคาร" arrives as one token
  // and no split can reach "พื้น". SYNONYMS doubles as the curated vocabulary
  // of this domain: when a group's name contains one of its terms, that term
  // becomes a keyword in its own right alongside the words real files use for
  // the same thing.
  const domainTerms = Object.keys(SYNONYMS).filter((term) => withoutNumber.includes(term));
  const synonyms = domainTerms.flatMap((term) => [term, ...SYNONYMS[term]]);

  return [...new Set([...parts, ...synonyms.map((word) => word.toLowerCase())])];
}

// Peels filler off both ends of a run-on phrase: "งานพื้นอาคาร" -> "พื้น".
// Repeats because names stack them, as in "งานระบบไฟฟ้า".
function stripNoise(part: string): string {
  let current = part;
  let changed = true;
  while (changed) {
    changed = false;
    for (const filler of NOISE) {
      if (current.startsWith(filler) && current.length > filler.length + 2) {
        current = current.slice(filler.length);
        changed = true;
      }
      if (current.endsWith(filler) && current.length > filler.length + 2) {
        current = current.slice(0, -filler.length);
        changed = true;
      }
    }
  }
  return current;
}

function countMatches(haystack: string, keywords: string[]): string[] {
  const text = haystack.toLowerCase();
  return keywords.filter((keyword) => text.includes(keyword));
}

export function suggestGroups({
  fileName,
  text,
  groups,
  categories,
  limit = 3,
}: {
  fileName: string;
  /** Text pulled out of the file, when there was any to pull. */
  text?: string;
  groups: DocumentGroup[];
  categories: DocumentCategory[];
  limit?: number;
}): Suggestion[] {
  const byId = new Map(categories.map((category) => [category.id, category]));

  const scored = groups.map((group) => {
    const keywords = keywordsForGroup(group);
    const inName = countMatches(fileName, keywords);
    const inText = text ? countMatches(text, keywords) : [];

    // A name is chosen by a person and is worth more than a word that happened
    // to appear somewhere in the document body.
    const score = inName.length * 3 + inText.length;

    return {
      group,
      category: byId.get(group.category_id),
      score,
      matched: [...new Set([...inName, ...inText])],
    };
  });

  return scored
    .filter((suggestion) => suggestion.score > 0)
    .sort((a, b) => b.score - a.score || a.group.sort_order - b.group.sort_order)
    .slice(0, limit);
}
