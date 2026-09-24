import { expect, test, type Page } from "@playwright/test";
import seed, { FIXTURE, fixtureCategoryUrl } from "./fixture";

// specs/049-end-to-end-scenarios US4.
//
// The account holder works from a phone on site, and until now "does it fit at
// 375px" was a person's job on a list of manual checks. A real viewport can
// answer it: nothing may scroll sideways, and no control may sit past the right
// edge where a finger cannot reach it — the exact defect specs/040 found in the
// category header, where the manage button ran 34px off-screen.

const WIDTH = 375;

test.use({ viewport: { width: WIDTH, height: 812 } });

test.beforeEach(async () => {
  await seed();
});

async function pagesToCheck(): Promise<{ name: string; url: string }[]> {
  return [
    { name: "หมวดเอกสาร", url: await fixtureCategoryUrl() },
    { name: "ห้องและประเภทงาน", url: `/photos/${FIXTURE.rooms.first}/${FIXTURE.workType}` },
    { name: "เช็คลิสต์", url: "/checklist" },
    { name: "อัปโหลดรูป", url: "/upload" },
  ];
}

async function widthOverflow(page: Page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
}

test("no main page scrolls sideways at 375px", async ({ page }) => {
  for (const { name, url } of await pagesToCheck()) {
    await page.goto(url);
    const { scrollWidth, clientWidth } = await widthOverflow(page);
    expect(scrollWidth, `${name} (${url}) is wider than the screen`).toBeLessThanOrEqual(clientWidth);
  }
});

test("no control on a main page sits past the right edge at 375px", async ({ page }) => {
  for (const { name, url } of await pagesToCheck()) {
    await page.goto(url);

    const controls = await page.getByRole("button").all();
    for (const control of controls) {
      if (!(await control.isVisible())) continue;
      const box = await control.boundingBox();
      if (!box) continue;
      const label = (await control.getAttribute("aria-label")) ?? (await control.innerText()).slice(0, 30);
      expect(box.x, `"${label}" on ${name} starts off-screen`).toBeGreaterThanOrEqual(0);
      expect(
        box.x + box.width,
        `"${label}" on ${name} runs ${Math.round(box.x + box.width - WIDTH)}px past the edge`
      ).toBeLessThanOrEqual(WIDTH);
    }
  }
});

test("a long sub-group name and a room name keep their rows intact", async ({ page }) => {
  await page.goto(await fixtureCategoryUrl());

  // The longest name in the fixture exists for this: it has to wrap inside its
  // row rather than push the row wider than the screen.
  const row = page.getByRole("button", { name: new RegExp(FIXTURE.groups.longName.slice(0, 20)) });
  const box = await row.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x + box!.width).toBeLessThanOrEqual(WIDTH);
  // Wrapped, not cut: the end of the name is on screen too.
  await expect(row).toContainText(FIXTURE.groups.longName.slice(-10));

  await page.goto(`/photos/${FIXTURE.rooms.first}/${FIXTURE.workType}`);
  const heading = page.getByRole("heading", { level: 1 });
  const headingBox = await heading.boundingBox();
  expect(headingBox!.x + headingBox!.width).toBeLessThanOrEqual(WIDTH);
});
