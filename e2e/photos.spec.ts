import { expect, test } from "@playwright/test";
import seed, { FIXTURE } from "./fixture";
import { saved } from "./saved";

// specs/049-end-to-end-scenarios US2, the photo half.
//
// Driven at phone width deliberately: the site walk-through is done on a phone,
// and that is the layout the uploader offers a tap-to-file card instead of
// dragging a thumbnail into a bin. It is also the path nothing has ever
// exercised outside a fake DOM.

const room = { slug: FIXTURE.rooms.first, name: "ห้องแรก" };
const workType = { slug: FIXTURE.workType, name: "งานผนังและกำแพงกันไฟ" };

// A real 1×1 PNG: the browser builds a preview from it, so bytes that are not
// an image would fail for the wrong reason.
const photo = {
  name: "ผนังกันไฟด้านทิศเหนือ.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  ),
};

test.use({ viewport: { width: 375, height: 812 } });

test.beforeEach(async () => {
  await seed();
});

test("a photo uploaded into a room and work type shows there, and can be taken away again", async ({ page }) => {
  await page.goto("/upload");
  await page.locator('input[type="file"]').setInputFiles(photo);

  await page.getByRole("button", { name: room.name, exact: true }).click();
  await page.getByRole("button", { name: new RegExp(workType.name) }).click();
  await saved(page, () => page.getByRole("button", { name: "เพิ่มรูปนี้เข้าห้อง/หมวดนี้" }).click());

  const grid = `/photos/${room.slug}/${workType.slug}`;
  await page.goto(grid);
  await expect(page.getByRole("button", { name: `เปิดไฟล์ ${photo.name}` })).toBeVisible();

  await page.getByRole("button", { name: `ลบรูป ${photo.name}` }).click();
  await saved(page, () => page.getByRole("button", { name: "ลบ", exact: true }).click());

  await page.goto(grid);
  await expect(page.getByRole("button", { name: `เปิดไฟล์ ${photo.name}` })).toHaveCount(0);
});
