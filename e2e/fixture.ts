import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import Module from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

// specs/049-end-to-end-scenarios research Decisions 3 and 4.
//
// Built through the app's own local-store functions rather than by writing a
// JSON file: the shape belongs to the app, and calling the store means the
// fixture is always in whatever shape the app currently reads. Rebuilt from
// scratch every run, so a leftover from a scenario that adds or deletes can
// never make the next run agree or disagree wrongly.

// Outside the project on purpose: the dev server watches the project tree, and
// this folder is wiped and rebuilt before every scenario — churn the watcher has
// no reason to see. The name is fixed, so a second run reads exactly what the
// first did, and it is nowhere near the .local-data/ folder `npm run dev` uses.
export const E2E_DATA_DIR = path.join(tmpdir(), "dg-warehouse01-e2e");

export const FIXTURE = {
  categoryName: "หมวดทดสอบ E2E",
  groups: {
    withFile: "ใบรับรองและสเปก",
    empty: "ผลทดสอบ",
    longName: "แบบแผนปรับปรุง — สายล่อฟ้า / ประตู / อุปกรณ์ดูดซับทรายแห้ง / อ่างล้างตา",
  },
  items: {
    have: "สเปกพัดลมกันระเบิด ระบุยี่ห้อและรุ่น",
    missing: "ใบรับรอง (Certificate) Emergency Shower",
    waiting: "ใบรายงานผลตรวจวัดค่าความต้านทาน (โอห์ม) ของพื้นกันไฟฟ้าสถิต",
  },
  document: "ใบเซอประตูม้วน.pdf",
  task: "ตรวจสอบระบบดับเพลิงและอุปกรณ์ตรวจจับ",
  rooms: { first: "hong-raek", second: "hong-klang" },
  workType: "firewalls",
} as const;

// Read back rather than passed around: the scenarios run in their own
// processes, and the category's address is decided by the app when the fixture
// creates it.
export async function fixtureCategoryUrl(): Promise<string> {
  const db = JSON.parse(await readFile(path.join(E2E_DATA_DIR, "db.json"), "utf8")) as {
    documentCategories: { slug: string; name_th: string }[];
  };
  const category = db.documentCategories.find((candidate) => candidate.name_th === FIXTURE.categoryName);
  if (!category) throw new Error("fixture: the category is missing from .e2e-data");
  return `/documents/${category.slug}`;
}

export default async function seed() {
  process.env.LOCAL_DATA_DIR = E2E_DATA_DIR;
  await rm(E2E_DATA_DIR, { recursive: true, force: true });

  loadAppModulesTheWayNextDoes();

  // Imported after LOCAL_DATA_DIR is set: the store reads it when the module
  // first loads, exactly as the Vitest setup does.
  const store = await import("../lib/local/store");

  const category = await store.localCreateDocumentCategory(FIXTURE.categoryName, "🧪");
  if (!category) throw new Error("fixture: could not create the category");

  const withFile = await store.localCreateDocumentGroup(category.id, FIXTURE.groups.withFile);
  const empty = await store.localCreateDocumentGroup(category.id, FIXTURE.groups.empty);
  const longName = await store.localCreateDocumentGroup(category.id, FIXTURE.groups.longName);
  if (!withFile || !empty || !longName) throw new Error("fixture: could not create the sub-groups");

  await store.localSetGroupDescription(withFile.id, "ใบรับรองผลิตภัณฑ์และสเปกชีทของวัสดุที่ติดตั้งจริง");

  // One of each status, so the read view and the editor both have something to
  // show and the status control has somewhere to move to.
  await store.localAddRequirement({ groupId: withFile.id, nameTh: FIXTURE.items.have, status: "have", note: "Chatwanee BPS-60" });
  await store.localAddRequirement({ groupId: withFile.id, nameTh: FIXTURE.items.missing, status: "missing", note: null });
  await store.localAddRequirement({
    groupId: withFile.id,
    nameTh: FIXTURE.items.waiting,
    status: "waiting",
    note: "รอทำสายล่อฟ้าเสร็จก่อน",
  });

  await store.localSaveDocumentFile(
    category.id,
    withFile.id,
    new File(["ใบเซอประตูม้วน"], FIXTURE.document, { type: "application/pdf" })
  );

  await store.localAddChecklistItem({
    text: FIXTURE.task,
    roomIds: [FIXTURE.rooms.first, FIXTURE.rooms.second],
  });

  return { categorySlug: category.slug };
}

// The fixture calls the app's own store, and that module is written for Next's
// module resolution: it opens with `import "server-only"` and refers to its
// neighbours as "@/lib/…". Neither survives a plain Node require, so both are
// arranged here before the store is loaded — the same two substitutions Vitest
// makes with resolve aliases (vitest.config.ts, vitest.server-only-shim.ts).
function loadAppModulesTheWayNextDoes() {
  const root = process.cwd();
  const internals = Module as unknown as {
    _cache: Record<string, unknown>;
    _resolveFilename: (request: string, ...rest: unknown[]) => string;
  };

  // "server-only" throws unless a bundler aliased it away. Pre-loading it as an
  // empty module is what that alias amounts to.
  const requireFrom = Module.createRequire(path.join(root, "package.json"));
  const serverOnly = requireFrom.resolve("server-only");
  if (!internals._cache[serverOnly]) {
    const stub = new Module(serverOnly, undefined);
    stub.exports = {};
    stub.loaded = true;
    internals._cache[serverOnly] = stub;
  }

  // "@/x" means "x from the project root" (tsconfig paths). Node has no such
  // notion, so it is translated here, extension included: Node would otherwise
  // look for x.js beside a file that only exists as x.ts.
  if (aliasInstalled) return;
  aliasInstalled = true;
  const resolve = internals._resolveFilename.bind(internals);
  internals._resolveFilename = (request, ...rest) => {
    if (!request.startsWith("@/")) return resolve(request, ...rest);
    const target = path.join(root, request.slice(2));
    for (const candidate of [target, `${target}.ts`, `${target}.tsx`, path.join(target, "index.ts")]) {
      if (existsSync(candidate) && !candidate.endsWith(path.sep)) return resolve(candidate, ...rest);
    }
    return resolve(target, ...rest);
  };
}

let aliasInstalled = false;
