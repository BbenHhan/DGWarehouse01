import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import seed, { FIXTURE, fixtureCategoryUrl } from "./fixture";
import { saved } from "./saved";

// specs/049-end-to-end-scenarios US2.
//
// Uploading is the app's reason to exist, and until now no check has ever sent
// a file through the page: the action was called with a File built in memory.
// This posts a real multipart form from a real browser, reads the archive back
// out through the download button, and removes the document again.

const uploaded = {
  name: "ใบรับรองการติดตั้งสายล่อฟ้า.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4\nใบรับรองการติดตั้งสายล่อฟ้า\n%%EOF\n"),
};

test.beforeEach(async () => {
  await seed();
});

async function uploadInto(page: Page, group: string) {
  await page.getByLabel("หมวดย่อย/กลุ่ม (ไม่บังคับ)").fill(group);
  await page.keyboard.press("Escape");
  await saved(page, () => page.locator('input[type="file"]').setInputFiles(uploaded));
}

async function openFolder(page: Page, group: string) {
  await page.getByRole("button", { name: new RegExp(group) }).click();
}

test("a file uploaded through the page lands in the sub-group that was chosen", async ({ page }) => {
  const url = await fixtureCategoryUrl();
  await page.goto(url);

  // Deliberately the sub-group that starts out empty, so finding the file
  // there cannot be the fixture's own document being mistaken for it.
  await uploadInto(page, FIXTURE.groups.empty);

  await page.goto(url);
  await openFolder(page, FIXTURE.groups.empty);
  await expect(page.getByText(uploaded.name)).toBeVisible();
});

test("the download button yields an archive a real unzip can open, with a folder per sub-group", async ({ page }) => {
  const url = await fixtureCategoryUrl();
  await page.goto(url);
  await uploadInto(page, FIXTURE.groups.empty);
  await page.goto(url);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    // A link that Base UI renders with button semantics, so that is how it is
    // reached here.
    page.getByRole("button", { name: "ดาวน์โหลด ZIP" }).click(),
  ]);

  const workDir = await mkdtemp(path.join(tmpdir(), "dg-e2e-zip-"));
  try {
    const archive = path.join(workDir, "category.zip");
    await download.saveAs(archive);

    // Extracted by the machine's own tool rather than by a reader written
    // here: "the archive opens" is the claim, and only a real extractor can
    // make it. macOS's own `unzip` predates UTF-8 names, so `ditto` — what
    // Finder uses — is the one that speaks for the Finder double-click.
    const into = path.join(workDir, "out");
    if (process.platform === "darwin") {
      execFileSync("ditto", ["-x", "-k", archive, into]);
    } else {
      execFileSync("unzip", ["-q", "-O", "UTF-8", archive, "-d", into]);
    }

    const [root] = await readdir(into);
    expect(root).toContain(FIXTURE.categoryName);

    const folders = await readdir(path.join(into, root));
    // Every sub-group gets a folder, including the ones holding nothing: the
    // archive doubles as a list of what is still missing.
    for (const group of Object.values(FIXTURE.groups)) {
      expect(folders.some((folder) => folder.includes(group.slice(0, 12)))).toBe(true);
    }

    const chosen = folders.find((folder) => folder.includes(FIXTURE.groups.empty))!;
    expect(await readdir(path.join(into, root, chosen))).toContain(uploaded.name);

    const withFile = folders.find((folder) => folder.includes(FIXTURE.groups.withFile))!;
    expect(await readdir(path.join(into, root, withFile))).toContain(FIXTURE.document);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
});

test("a document deleted through the page is gone from the list", async ({ page }) => {
  const url = await fixtureCategoryUrl();
  await page.goto(url);
  await openFolder(page, FIXTURE.groups.withFile);
  await expect(page.getByText(FIXTURE.document)).toBeVisible();

  await page.getByRole("button", { name: `ลบเอกสาร ${FIXTURE.document}` }).click();
  await saved(page, () => page.getByRole("button", { name: "ลบ", exact: true }).click());

  await page.goto(url);
  await openFolder(page, FIXTURE.groups.withFile);
  await expect(page.getByText(FIXTURE.document)).toBeHidden();
});
