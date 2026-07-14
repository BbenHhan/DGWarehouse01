import { afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Points lib/local/store.ts at a disposable temp directory for the whole
// test run instead of the developer's real .local-data/ folder (FR-003,
// specs/005-automated-testing).
//
// This MUST run as top-level code, not inside beforeAll(): Vitest resolves a
// test file's static imports (which is when lib/local/store.ts's
// module-level `LOCAL_BASE_DIR` constant gets computed) before invoking any
// beforeAll hook body. Setting the env var inside beforeAll was too late —
// confirmed by a real run that leaked "test-room-*" data into the real
// .local-data/db.json. Top-level code in a setupFile runs before the test
// file's own imports are resolved, which is early enough.
const tempDir = mkdtempSync(path.join(tmpdir(), "dgwarehouse01-test-"));
process.env.LOCAL_DATA_DIR = tempDir;

afterAll(() => {
  rmSync(tempDir, { recursive: true, force: true });
});
