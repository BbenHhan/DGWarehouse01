import { describe, expect, it } from "vitest";
import { chunkFiles } from "@/lib/upload-session";

function makeFile(name: string): File {
  return new File(["x"], name, { type: "image/jpeg" });
}

describe("chunkFiles", () => {
  it("returns a single chunk when under the limit", () => {
    const files = [makeFile("a"), makeFile("b")];
    expect(chunkFiles(files, 20)).toEqual([files]);
  });

  it("splits exactly at the boundary with no empty trailing chunk", () => {
    const files = Array.from({ length: 20 }, (_, i) => makeFile(`f${i}`));
    const chunks = chunkFiles(files, 20);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toHaveLength(20);
  });

  it("splits into two chunks just over the boundary", () => {
    const files = Array.from({ length: 21 }, (_, i) => makeFile(`f${i}`));
    const chunks = chunkFiles(files, 20);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(20);
    expect(chunks[1]).toHaveLength(1);
  });

  it("splits an in-between count into two roughly even chunks", () => {
    const files = Array.from({ length: 19 }, (_, i) => makeFile(`f${i}`));
    expect(chunkFiles(files, 20)).toEqual([files]);
  });
});
