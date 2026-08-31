import { describe, expect, it } from "vitest";
import { storageKeyFileName } from "@/lib/storage-key";

// Supabase Storage answers any key with a non-ASCII character with a 400
// InvalidKey — verified live against the real project, which is what made
// every Thai-named upload fail. These assert the shape Storage accepts.
const STORAGE_SAFE = /^[A-Za-z0-9._-]+$/;

describe("storageKeyFileName", () => {
  it("leaves an already-safe name alone", () => {
    expect(storageKeyFileName("drawing-01.pdf")).toBe("drawing-01.pdf");
  });

  it("keeps the extension when the name is Thai", () => {
    expect(storageKeyFileName("แปลนอาคาร.pdf")).toBe("file.pdf");
  });

  it("keeps the ASCII part of a mixed name", () => {
    expect(storageKeyFileName("plan-แปลน-01.pdf")).toBe("plan--01.pdf");
  });

  it("strips a non-ASCII extension too", () => {
    expect(storageKeyFileName("report.ไทย")).toBe("report");
  });

  it("handles a name with no extension at all", () => {
    expect(storageKeyFileName("เอกสาร")).toBe("file");
  });

  it("treats a leading dot as part of the name, not an extension", () => {
    expect(storageKeyFileName(".gitignore")).toBe(".gitignore");
  });

  it("keeps only the last dot as the extension separator", () => {
    expect(storageKeyFileName("แผน.ชั้น.1.pdf")).toBe("..1.pdf");
  });

  it("drops spaces, which Storage also rejects", () => {
    expect(storageKeyFileName("fire exit plan.pdf")).toBe("fireexitplan.pdf");
  });

  it("never returns an empty key", () => {
    expect(storageKeyFileName("")).toBe("file");
    expect(storageKeyFileName("ไทย")).toBe("file");
    // Dots alone are a legal key but a useless name, so it falls back too.
    expect(storageKeyFileName("...")).toBe("file");
  });

  it.each([
    "แปลนอาคาร.pdf",
    "รูปหน้างาน 2569.jpg",
    "งานผนัง+กำแพงกันไฟ (ฉบับแก้ไข).docx",
    "report.ไทย",
    "เอกสาร",
    "a b/c\\d:e*f?g.pdf",
  ])("produces a Storage-safe key for %s", (name) => {
    expect(storageKeyFileName(name)).toMatch(STORAGE_SAFE);
  });
});
