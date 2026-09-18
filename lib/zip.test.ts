import { describe, expect, it } from "vitest";
import { archiveSafeName, crc32, zipStream, type ZipEntry } from "@/lib/zip";
import { parseZip as parse } from "@/lib/zip-test-helpers";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function drain(stream: ReadableStream<Uint8Array>): Promise<void> {
  const reader = stream.getReader();
  for (;;) {
    const { done } = await reader.read();
    if (done) return;
  }
}

async function collect(entries: ZipEntry[]): Promise<Buffer> {
  const stream = zipStream(
    (async function* () {
      for (const entry of entries) yield entry;
    })(),
    () => new Date(2026, 8, 12, 10, 30, 0)
  );

  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

describe("crc32", () => {
  it("matches the known checksum for a standard input", () => {
    expect(crc32(encoder.encode("123456789"))).toBe(0xcbf43926);
  });

  it("is zero for empty input", () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
  });
});

describe("zipStream", () => {
  it("round-trips file contents", async () => {
    const body = "ผลทดสอบทนไฟ ".repeat(50);
    const zip = await collect([{ path: "หมวด/รายงาน.pdf", data: encoder.encode(body) }]);

    const entries = parse(zip);
    expect(entries).toHaveLength(1);
    expect(decoder.decode(entries[0].contents)).toBe(body);
  });

  it("flags every name as UTF-8 so Thai survives on other platforms", async () => {
    const zip = await collect([
      { path: "หมวดที่ 6 ยื่นขออนุญาต/" },
      { path: "หมวดที่ 6 ยื่นขออนุญาต/ใบเซอ.pdf", data: encoder.encode("x") },
    ]);

    const entries = parse(zip);
    expect(entries.map((entry) => entry.utf8Flag)).toEqual([true, true]);
    expect(entries.map((entry) => entry.name)).toEqual([
      "หมวดที่ 6 ยื่นขออนุญาต/",
      "หมวดที่ 6 ยื่นขออนุญาต/ใบเซอ.pdf",
    ]);
  });

  it("keeps an empty folder as a folder", async () => {
    const zip = await collect([{ path: "6.4 ใบรายงานผลตรวจวัดพื้น/" }]);

    const entries = parse(zip);
    expect(entries[0].isDirectory).toBe(true);
    expect(entries[0].contents).toHaveLength(0);
  });

  it("compresses what compresses and stores what does not", async () => {
    const compressible = encoder.encode("a".repeat(4096));
    // Deflate cannot shrink 256 distinct bytes; storing keeps it from growing.
    const incompressible = new Uint8Array(Array.from({ length: 256 }, (_, i) => i));
    const zip = await collect([
      { path: "text.txt", data: compressible },
      { path: "noise.bin", data: incompressible },
    ]);

    const entries = parse(zip);
    expect(Buffer.from(compressible).equals(entries[0].contents)).toBe(true);
    expect(Buffer.from(incompressible).equals(entries[1].contents)).toBe(true);
    expect(zip.length).toBeLessThan(compressible.length);
  });

  // specs/047 FR-010. Past the 32-bit ceilings the numbers wrap and the archive
  // downloads "successfully" and then will not open. Failing is the only
  // outcome that tells anyone.
  it("errors rather than writing an archive past the size the format holds", async () => {
    // The real ceiling is 4 GB; lowering it here exercises the same guard
    // without allocating four gigabytes to do it.
    // 256 distinct bytes do not compress, so each entry really is ~295 bytes on
    // the wire: the first fits under the ceiling, the second cannot.
    const incompressible = new Uint8Array(Array.from({ length: 256 }, (_, i) => i));
    const stream = zipStream(
      (async function* () {
        yield { path: "first.bin", data: incompressible };
        yield { path: "second.bin", data: incompressible };
      })(),
      () => new Date(2026, 8, 12),
      { maxBytes: 400 }
    );

    await expect(drain(stream)).rejects.toThrow(/ใหญ่เกินขนาดสูงสุด/);
  });

  it("errors rather than writing more entries than the format holds", async () => {
    const stream = zipStream(
      (async function* () {
        for (let i = 0; i < 5; i += 1) yield { path: `f${i}.txt` };
      })(),
      () => new Date(2026, 8, 12),
      { maxEntries: 3 }
    );

    await expect(drain(stream)).rejects.toThrow(/เกินจำนวนสูงสุด 3 รายการ/);
  });

  it("writes every entry when the archive stays inside the limits", async () => {
    const zip = await collect([
      { path: "a.txt", data: encoder.encode("ก") },
      { path: "b.txt", data: encoder.encode("ข") },
    ]);
    expect(parse(zip).map((entry) => entry.name)).toEqual(["a.txt", "b.txt"]);
  });

  it("writes a readable archive when there is nothing in it", async () => {
    const zip = await collect([]);
    expect(parse(zip)).toEqual([]);
  });
});

describe("archiveSafeName", () => {
  it("replaces separators that would become folder levels", () => {
    expect(archiveSafeName("ใบรับรอง — สปริงเกลอร์ / Emergency Shower")).toBe(
      "ใบรับรอง — สปริงเกลอร์ - Emergency Shower"
    );
  });

  it("leaves an ordinary name alone", () => {
    expect(archiveSafeName("6.14 ทดสอบ")).toBe("6.14 ทดสอบ");
  });
});
