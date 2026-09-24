import { expect, test } from "@playwright/test";
import seed, { FIXTURE, fixtureCategoryUrl } from "./fixture";
import { saved } from "./saved";

// specs/049-end-to-end-scenarios US1.
//
// The checklist is the feature the account holder uses to decide what still has
// to be chased, and every existing check for it stops at the module boundary:
// the action is called directly, or the component is rendered into a fake DOM.
// Nothing so far has proved that a status tapped in a browser is still that
// status after the page is loaded again — which is the only question that
// matters on site.

const group = FIXTURE.groups.withFile;

// Each scenario changes the data it is looking at, so each starts from the
// fixture as built. Without this the file would only pass in its own order, and
// running one scenario on its own would fail.
test.beforeEach(async () => {
  await seed();
});

async function openTheFixtureCategory(page: import("@playwright/test").Page) {
  const url = await fixtureCategoryUrl();
  await page.goto(url);
  await expect(page.getByRole("heading", { name: new RegExp(FIXTURE.categoryName) })).toBeVisible();
  return url;
}

async function manage(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "จัดการหมวด" }).click();
  await expect(page.getByRole("button", { name: "เสร็จสิ้น" })).toBeVisible();
}

test("every sub-group's items are readable without opening a single folder", async ({ page }) => {
  await openTheFixtureCategory(page);

  const items = page.getByRole("list", { name: "รายการเอกสารที่ต้องมี" }).first();
  await expect(items).toBeVisible();

  // All three statuses, each carrying its Thai word rather than a colour alone.
  await expect(items.getByText(FIXTURE.items.have)).toBeVisible();
  await expect(items.getByText("มีแล้ว")).toBeVisible();
  await expect(items.getByText(FIXTURE.items.missing)).toBeVisible();
  await expect(items.getByText("ยังขาด")).toBeVisible();
  await expect(items.getByText(FIXTURE.items.waiting)).toBeVisible();
  await expect(items.getByText("รอดำเนินการ")).toBeVisible();

  // The folder itself is still shut: the file inside it is not on screen.
  await expect(page.getByText(FIXTURE.document)).toBeHidden();
});

test("an item added in the browser is still there after the page is loaded again", async ({ page }) => {
  const categoryUrl = await openTheFixtureCategory(page);
  await manage(page);

  const name = "ใบรับรองการติดตั้งถังดับเพลิง";
  const field = page.getByLabel(`เพิ่มรายการที่ต้องมีใน ${group}`);
  await field.fill(name);
  // Scoped to this sub-group's own form: the page also carries the
  // add-sub-group form, whose button is worded the same.
  await saved(page, () =>
    page.locator("form").filter({ has: field }).getByRole("button", { name: "เพิ่ม" }).click()
  );

  // In management mode a name is an editable field, not text, so the item is
  // recognised by the controls that belong to it.
  const list = page.getByRole("list", { name: `รายการเอกสารที่ต้องมีของ ${group}` });
  await expect(list.getByRole("group", { name: `สถานะของ ${name}` })).toBeVisible();

  await page.goto(categoryUrl);
  await expect(page.getByText(name)).toBeVisible();
});

test("a status tapped in the browser is the status the page reports afterwards", async ({ page }) => {
  const categoryUrl = await openTheFixtureCategory(page);
  await manage(page);

  // The item the fixture leaves at ยังขาด, set to มีแล้ว. Reloading is the
  // whole point: an optimistic update looks identical until the page is
  // fetched again.
  const status = page.getByRole("group", { name: `สถานะของ ${FIXTURE.items.missing}` });
  await expect(status.getByRole("button", { name: "ยังขาด" })).toHaveAttribute("aria-pressed", "true");
  await saved(page, () => status.getByRole("button", { name: "มีแล้ว" }).click());
  await expect(status.getByRole("button", { name: "มีแล้ว" })).toHaveAttribute("aria-pressed", "true");

  await page.goto(categoryUrl);
  await manage(page);
  const afterwards = page.getByRole("group", { name: `สถานะของ ${FIXTURE.items.missing}` });
  await expect(afterwards.getByRole("button", { name: "มีแล้ว" })).toHaveAttribute("aria-pressed", "true");
  await expect(afterwards.getByRole("button", { name: "ยังขาด" })).toHaveAttribute("aria-pressed", "false");
});

test("a deleted item does not come back on the next load", async ({ page }) => {
  const categoryUrl = await openTheFixtureCategory(page);
  await manage(page);

  await saved(page, () => page.getByRole("button", { name: `ลบรายการ ${FIXTURE.items.waiting}` }).click());
  await expect(page.getByRole("group", { name: `สถานะของ ${FIXTURE.items.waiting}` })).toHaveCount(0);

  await page.goto(categoryUrl);
  await expect(page.getByText(FIXTURE.items.waiting)).toBeHidden();
});
