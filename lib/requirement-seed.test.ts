import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { requirementStatusFromLabel } from "@/lib/requirement-status";
import type { RequirementStatus } from "@/lib/types";

// specs/046-subgroup-requirement-checklist SC-002 / FR-018.
//
// หมวด 6's starting checklist exists twice: as the audited appendix in the spec
// (what a person reads and corrects) and as rows in migration 0015 (what the
// database receives). Forty-odd hand-copied rows are exactly where a dropped line
// or a swapped status hides, so this reads both and requires them to agree.

type Item = { name: string; status: RequirementStatus; note: string | null };
type Seed = { categoryDescription: string; groups: Map<string, { description: string; items: Item[] }> };

const ROOT = process.cwd();
const spec = readFileSync(path.join(ROOT, "specs/046-subgroup-requirement-checklist/spec.md"), "utf-8");
const sql = readFileSync(path.join(ROOT, "supabase/migrations/0015_group_requirements.sql"), "utf-8");

function fromAppendix(markdown: string): Seed {
  const appendix = markdown.slice(markdown.indexOf("## Appendix: Initial content for หมวด 6"));
  const sections = appendix.split(/\n### /).slice(1);
  const groups: Seed["groups"] = new Map();
  let categoryDescription = "";

  for (const section of sections) {
    const [title, ...lines] = section.split("\n");
    if (title.startsWith("Category description")) {
      categoryDescription = lines.map((line) => line.trim()).filter(Boolean)[0] ?? "";
      continue;
    }
    const description = (lines.find((line) => line.startsWith("**Description**:")) ?? "")
      .replace("**Description**:", "")
      .trim();
    const items = lines
      .filter((line) => line.startsWith("| ") && !line.startsWith("| Item ") && !line.startsWith("|---"))
      .map((line) => {
        const [name, label, note] = line.split("|").slice(1, 4).map((cell) => cell.trim());
        const status = requirementStatusFromLabel(label);
        if (!status) throw new Error(`appendix row "${name}" has unknown status "${label}"`);
        return { name, status, note: note.length > 0 ? note : null };
      });
    groups.set(title.trim(), { description, items });
  }
  return { categoryDescription, groups };
}

const QUOTED = `'((?:[^']|'')*)'`;
const unquote = (value: string) => value.replace(/''/g, "'");

function fromMigration(text: string): Seed {
  const groups: Seed["groups"] = new Map();

  const categoryMatch = text.match(new RegExp(`category_wording \\(description\\) as \\(values \\(${QUOTED}\\)\\)`));
  const categoryDescription = categoryMatch ? unquote(categoryMatch[1]) : "";

  const wordingBlock = text.slice(text.indexOf("group_wording (name_th, description)"), text.indexOf("update document_groups"));
  for (const match of wordingBlock.matchAll(new RegExp(`\\(${QUOTED},\\s*${QUOTED}\\)`, "g"))) {
    groups.set(unquote(match[1]), { description: unquote(match[2]), items: [] });
  }

  const itemsBlock = text.slice(text.indexOf("seed_items (group_name, position, name_th, status, note)"));
  const row = new RegExp(`\\(${QUOTED},\\s*(\\d+),\\s*${QUOTED},\\s*'(have|missing|waiting)',\\s*(null|${QUOTED})\\)`, "g");
  const positions = new Map<string, number[]>();
  for (const match of itemsBlock.matchAll(row)) {
    const groupName = unquote(match[1]);
    const group = groups.get(groupName) ?? { description: "", items: [] };
    group.items.push({
      name: unquote(match[3]),
      status: match[4] as RequirementStatus,
      note: match[5] === "null" ? null : unquote(match[6]),
    });
    groups.set(groupName, group);
    positions.set(groupName, [...(positions.get(groupName) ?? []), Number(match[2])]);
  }

  // Positions must be 1..n in the order the rows are written.
  for (const [groupName, list] of positions) {
    expect(list, `positions for ${groupName}`).toEqual(list.map((_, index) => index + 1));
  }
  return { categoryDescription, groups };
}

describe("migration 0015 seed matches the spec appendix", () => {
  const expected = fromAppendix(spec);
  const actual = fromMigration(sql);

  it("found content in both places, so the comparison is not vacuous", () => {
    expect(expected.groups.size).toBeGreaterThanOrEqual(12);
    expect([...expected.groups.values()].reduce((sum, group) => sum + group.items.length, 0)).toBeGreaterThanOrEqual(45);
    expect(actual.groups.size).toBeGreaterThan(0);
  });

  it("seeds the same sub-groups, in the same order", () => {
    expect([...actual.groups.keys()]).toEqual([...expected.groups.keys()]);
  });

  it("gives every sub-group the appendix description", () => {
    for (const [name, group] of expected.groups) {
      expect(actual.groups.get(name)?.description, name).toBe(group.description);
    }
  });

  it("seeds every item with the appendix name, status and note, in order", () => {
    for (const [name, group] of expected.groups) {
      expect(actual.groups.get(name)?.items, name).toEqual(group.items);
    }
  });

  it("seeds the category description", () => {
    expect(expected.categoryDescription.length).toBeGreaterThan(0);
    expect(actual.categoryDescription).toBe(expected.categoryDescription);
  });
});

// FR-018 and US3 scenarios 2–3: running the migration again must not duplicate
// items or overwrite what editors have changed since; a renamed sub-group must
// be skipped, not guessed at.
describe("migration 0015 seed is safe to run again", () => {
  it("only fills descriptions that are still empty", () => {
    const updates = sql.match(/update document_(categories|groups)[\s\S]*?;/g) ?? [];
    expect(updates).toHaveLength(2);
    for (const statement of updates) expect(statement).toMatch(/description is null/);
  });

  it("only inserts items into a sub-group that has none yet", () => {
    const insert = sql.match(/insert into document_group_requirements[\s\S]*?;/)?.[0] ?? "";
    expect(insert).toMatch(/not exists\s*\(\s*select 1 from document_group_requirements/);
  });

  it("matches sub-groups by exact name inside หมวด 6 only", () => {
    const insert = sql.match(/insert into document_group_requirements[\s\S]*?;/)?.[0] ?? "";
    expect(insert).toMatch(/g\.name_th = seed_items\.group_name/);
    expect(insert).toMatch(/c\.slug = 'checklist-permit'/);
  });
});
