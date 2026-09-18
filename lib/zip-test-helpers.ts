const decoder = new TextDecoder();

import { inflateRawSync } from "node:zlib";
import { expect } from "vitest";
import { crc32 } from "@/lib/zip";

// The central-directory reader used by every test that inspects an archive:
// lib/zip.test.ts and the download route's test. Shared rather than copied so
// the two cannot drift, and deliberately reads the archive the way a real unzip
// does — through the central directory — so a header the writer got wrong shows
// up as a parse failure instead of a test that agrees with the writer's own
// assumptions.
export type ParsedEntry = {
  name: string;
  utf8Flag: boolean;
  isDirectory: boolean;
  contents: Buffer;
};

export function parseZip(zip: Buffer): ParsedEntry[] {
  const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  expect(eocd).toBeGreaterThan(-1);

  const total = zip.readUInt16LE(eocd + 10);
  let cursor = zip.readUInt32LE(eocd + 16);
  const parsed: ParsedEntry[] = [];

  for (let i = 0; i < total; i++) {
    expect(zip.readUInt32LE(cursor)).toBe(0x02014b50);
    const flags = zip.readUInt16LE(cursor + 8);
    const method = zip.readUInt16LE(cursor + 10);
    const crc = zip.readUInt32LE(cursor + 16);
    const compressedSize = zip.readUInt32LE(cursor + 20);
    const rawSize = zip.readUInt32LE(cursor + 24);
    const nameLength = zip.readUInt16LE(cursor + 28);
    const externalAttributes = zip.readUInt32LE(cursor + 38);
    const localOffset = zip.readUInt32LE(cursor + 42);
    const name = decoder.decode(zip.subarray(cursor + 46, cursor + 46 + nameLength));

    expect(zip.readUInt32LE(localOffset)).toBe(0x04034b50);
    const localNameLength = zip.readUInt16LE(localOffset + 26);
    const localExtraLength = zip.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const stored = zip.subarray(dataStart, dataStart + compressedSize);
    const contents = method === 8 ? inflateRawSync(stored) : Buffer.from(stored);

    expect(contents.length).toBe(rawSize);
    expect(crc32(new Uint8Array(contents))).toBe(crc);

    parsed.push({
      name,
      utf8Flag: (flags & 0x0800) !== 0,
      isDirectory: (externalAttributes & 0x10) !== 0,
      contents,
    });
    cursor += 46 + nameLength + zip.readUInt16LE(cursor + 30) + zip.readUInt16LE(cursor + 32);
  }

  return parsed;
}

