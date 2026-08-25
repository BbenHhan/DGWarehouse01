import { describe, expect, it } from "vitest";
import { rollupChecklistStatus } from "@/lib/checklist-status";

describe("rollupChecklistStatus", () => {
  it("returns todo for an empty list", () => {
    expect(rollupChecklistStatus([])).toBe("todo");
  });

  it("returns todo when every status is todo", () => {
    expect(rollupChecklistStatus(["todo", "todo", "todo"])).toBe("todo");
  });

  it("returns done when every status is done", () => {
    expect(rollupChecklistStatus(["done", "done"])).toBe("done");
  });

  it("returns in_progress for a mix of todo and done", () => {
    expect(rollupChecklistStatus(["todo", "done"])).toBe("in_progress");
  });

  it("returns in_progress when any status is in_progress", () => {
    expect(rollupChecklistStatus(["todo", "in_progress", "todo"])).toBe("in_progress");
  });

  it("returns in_progress for a single in_progress status", () => {
    expect(rollupChecklistStatus(["in_progress"])).toBe("in_progress");
  });
});
