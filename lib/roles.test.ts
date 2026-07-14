import { describe, expect, it } from "vitest";
import { canEdit, isAdmin, meetsRole } from "@/lib/roles";

describe("meetsRole", () => {
  it("returns true when role rank is greater than or equal to minRole", () => {
    expect(meetsRole("admin", "viewer")).toBe(true);
    expect(meetsRole("editor", "editor")).toBe(true);
  });

  it("returns false when role rank is below minRole", () => {
    expect(meetsRole("viewer", "editor")).toBe(false);
    expect(meetsRole("editor", "admin")).toBe(false);
  });
});

describe("canEdit", () => {
  it("is false for viewer", () => {
    expect(canEdit("viewer")).toBe(false);
  });

  it("is true for editor", () => {
    expect(canEdit("editor")).toBe(true);
  });

  it("is true for admin", () => {
    expect(canEdit("admin")).toBe(true);
  });
});

describe("isAdmin", () => {
  it("is false for viewer", () => {
    expect(isAdmin("viewer")).toBe(false);
  });

  it("is false for editor", () => {
    expect(isAdmin("editor")).toBe(false);
  });

  it("is true for admin", () => {
    expect(isAdmin("admin")).toBe(true);
  });
});
