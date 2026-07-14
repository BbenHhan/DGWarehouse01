import { describe, expect, it } from "vitest";
import { validatePassword } from "@/lib/password";

describe("validatePassword", () => {
  it("rejects an empty password", () => {
    expect(validatePassword("")).not.toBeNull();
  });

  it("rejects a 7-character password", () => {
    expect(validatePassword("abc1234")).not.toBeNull();
  });

  it("accepts an exactly 8-character password", () => {
    expect(validatePassword("abc12345")).toBeNull();
  });

  it("accepts a long password", () => {
    expect(validatePassword("a-much-longer-password-123")).toBeNull();
  });
});
