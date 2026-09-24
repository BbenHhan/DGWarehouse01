import { expect, test } from "@playwright/test";
import { FIXTURE, fixtureCategoryUrl } from "./fixture";

// specs/049-end-to-end-scenarios US5.
//
// Runs against the second instance, the one started with sign-in in the
// position production uses. Every other scenario runs with sign-in off, which
// is only safe if something proves the guard is still there — this is that
// something. Nothing here signs in: a visitor with no session is the whole
// subject.

test("every main page sends a visitor with no session to the sign-in screen", async ({ page }) => {
  const pages = [
    "/",
    "/documents",
    await fixtureCategoryUrl(),
    `/photos/${FIXTURE.rooms.first}/${FIXTURE.workType}`,
    "/checklist",
    "/upload",
    "/documents/upload",
  ];

  for (const url of pages) {
    await page.goto(url);
    await expect(page, `${url} let a signed-out visitor through`).toHaveURL(/\/login/);
  }
});

test("the sign-in screen itself loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "เข้าสู่ระบบ" })).toBeVisible();
});
