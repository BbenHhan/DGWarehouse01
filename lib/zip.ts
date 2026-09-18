import { deflateRaw } from "node:zlib";
import { promisify } from "node:util";

const deflate = promisify(deflateRaw);

// A ZIP writer rather than a dependency: the archive this app needs is a flat
// list of stored files, and the one detail every off-the-shelf option got
// wrong for us is the one below (UTF-8 names). Keeping it here also keeps
// `npm install` out of the picture — see the npm resolver trap in the
// project's setup notes.

/**
 * One member of the archive. A `path` ending in "/" with no `data` is an empty
 * directory, which is how a sub-group holding no files still shows up as a
 * folder the person can drop files into.
 */
export type ZipEntry = {
  path: string;
  data?: Uint8Array;
};

const LOCAL_SIGNATURE = 0x04034b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const EOCD_SIGNATURE = 0x06054b50;

const STORED = 0;
const DEFLATED = 8;

// The 32-bit ceilings of the layout written below. Past them the sizes and
// offsets wrap, and the archive downloads "successfully" and then refuses to
// open — the worst failure available, because whoever needed the bundle is the
// one who finds out. Zip64 lifts these limits and is deliberately not
// implemented: the whole app holds well under a gigabyte
// (specs/047 research Decision 2).
const MAX_ARCHIVE_BYTES = 0xffffffff;
const MAX_ENTRIES = 0xffff;

// Bit 11 of the general-purpose flags declares the file name to be UTF-8.
// macOS's bundled Info-ZIP never sets it and has no option to (`-UN` is not
// supported there), which is exactly what leaves Thai folder names as mojibake
// when the archive is opened on Windows. Every entry we write sets it.
const UTF8_NAME_FLAG = 0x0800;

// MS-DOS "directory" attribute, so an empty folder is recognised as a folder
// and not as a zero-byte file with an odd name.
const MSDOS_DIRECTORY = 0x10;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let value = i;
    for (let bit = 0; bit < 8; bit++) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ZIP stores timestamps in the 1980-epoch MS-DOS format, two seconds of
// resolution. Anything before 1980 cannot be represented, so it clamps.
function dosDateTime(when: Date): { time: number; date: number } {
  const year = Math.max(when.getFullYear(), 1980);
  const time = (when.getHours() << 11) | (when.getMinutes() << 5) | (when.getSeconds() >> 1);
  const date = ((year - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate();
  return { time, date };
}

type Placed = {
  nameBytes: Uint8Array;
  method: number;
  crc: number;
  compressedSize: number;
  rawSize: number;
  time: number;
  date: number;
  offset: number;
  isDirectory: boolean;
};

function localHeader(entry: Placed): Uint8Array {
  const header = new Uint8Array(30 + entry.nameBytes.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, LOCAL_SIGNATURE, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, UTF8_NAME_FLAG, true);
  view.setUint16(8, entry.method, true);
  view.setUint16(10, entry.time, true);
  view.setUint16(12, entry.date, true);
  view.setUint32(14, entry.crc, true);
  view.setUint32(18, entry.compressedSize, true);
  view.setUint32(22, entry.rawSize, true);
  view.setUint16(26, entry.nameBytes.length, true);
  view.setUint16(28, 0, true);
  header.set(entry.nameBytes, 30);
  return header;
}

function centralHeader(entry: Placed): Uint8Array {
  const record = new Uint8Array(46 + entry.nameBytes.length);
  const view = new DataView(record.buffer);
  view.setUint32(0, CENTRAL_SIGNATURE, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, UTF8_NAME_FLAG, true);
  view.setUint16(10, entry.method, true);
  view.setUint16(12, entry.time, true);
  view.setUint16(14, entry.date, true);
  view.setUint32(16, entry.crc, true);
  view.setUint32(20, entry.compressedSize, true);
  view.setUint32(24, entry.rawSize, true);
  view.setUint16(28, entry.nameBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, entry.isDirectory ? MSDOS_DIRECTORY : 0, true);
  view.setUint32(42, entry.offset, true);
  record.set(entry.nameBytes, 46);
  return record;
}

function endOfCentralDirectory(count: number, size: number, offset: number): Uint8Array {
  const record = new Uint8Array(22);
  const view = new DataView(record.buffer);
  view.setUint32(0, EOCD_SIGNATURE, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, count, true);
  view.setUint16(10, count, true);
  view.setUint32(12, size, true);
  view.setUint32(16, offset, true);
  view.setUint16(20, 0, true);
  return record;
}

/**
 * Streams the entries as a ZIP archive.
 *
 * One entry is read, compressed and emitted per `pull`, so the caller only
 * ever holds a single file in memory — a category can be far larger than the
 * server's heap and still download.
 */
export function zipStream(
  entries: AsyncIterable<ZipEntry>,
  now: () => Date = () => new Date(),
  // Overridable so the limits can be exercised without building a four-gigabyte
  // archive to do it; production always uses the format's real ceilings.
  limits: { maxBytes?: number; maxEntries?: number } = {}
) {
  const maxBytes = limits.maxBytes ?? MAX_ARCHIVE_BYTES;
  const maxEntries = limits.maxEntries ?? MAX_ENTRIES;
  const iterator = entries[Symbol.asyncIterator]();
  const encoder = new TextEncoder();
  const central: Uint8Array[] = [];
  let offset = 0;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const next = await iterator.next();

      if (next.done) {
        const directoryOffset = offset;
        let directorySize = 0;
        for (const record of central) {
          controller.enqueue(record);
          directorySize += record.length;
        }
        controller.enqueue(endOfCentralDirectory(central.length, directorySize, directoryOffset));
        controller.close();
        return;
      }

      if (central.length >= maxEntries) {
        controller.error(new Error(`ไฟล์ใน ZIP เกินจำนวนสูงสุด ${maxEntries} รายการ ดาวน์โหลดทีละหมวดย่อยแทน`));
        return;
      }

      const { path, data } = next.value;
      const isDirectory = path.endsWith("/");
      const raw = isDirectory ? new Uint8Array(0) : (data ?? new Uint8Array(0));

      // Deflate only earns its keep on text-shaped files; a scanned PDF or a
      // JPEG usually comes back bigger. Keeping whichever is smaller means the
      // archive is never larger than the files it holds.
      const compressed = isDirectory || raw.length === 0 ? raw : new Uint8Array(await deflate(raw));
      const useDeflate = compressed.length < raw.length;
      const body = useDeflate ? compressed : raw;

      const { time, date } = dosDateTime(now());
      const placed: Placed = {
        nameBytes: encoder.encode(path),
        method: useDeflate ? DEFLATED : STORED,
        crc: crc32(raw),
        compressedSize: body.length,
        rawSize: raw.length,
        time,
        date,
        offset,
        isDirectory,
      };

      const header = localHeader(placed);
      if (offset + header.length + body.length > maxBytes) {
        controller.error(new Error("ไฟล์ ZIP ใหญ่เกินขนาดสูงสุดที่รูปแบบ ZIP รองรับ (4 GB) ดาวน์โหลดทีละหมวดย่อยแทน"));
        return;
      }
      controller.enqueue(header);
      offset += header.length;
      if (body.length > 0) {
        controller.enqueue(body);
        offset += body.length;
      }
      central.push(centralHeader(placed));
    },

    async cancel(reason) {
      await iterator.return?.(reason);
    },
  });
}

// "/" would silently become a directory level and ":" is still illegal on some
// filesystems; a group really is named "… — สปริงเกลอร์ / Emergency Shower / …".
export function archiveSafeName(name: string): string {
  return name.replace(/[/:\\]/g, "-").replace(/\s+/g, " ").trim();
}
