import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { openMap, waitForIdle } from "./helpers";

const overlaps = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function shot(page: Page, info: import("@playwright/test").TestInfo, name: string) {
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path });
  await info.attach(name, { path, contentType: "image/png" });
}

test.describe("Sprint 3: markers, cards and stop list", () => {
  test("33 markers with 44 px touch targets", async ({ page }) => {
    await openMap(page);
    const markers = page.locator(".stop-marker");
    await expect(markers).toHaveCount(33);
    await page.getByRole("button", { name: /whole route/i }).click();
    await waitForIdle(page);
    const box = await markers.first().locator(".stop-marker-dot").boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test("tapping a marker opens its card without hiding the stop", async ({ page }, info) => {
    await openMap(page);
    await page.getByRole("button", { name: /2 graham center, stop 2 of 32/i }).click();
    const card = page.getByRole("dialog");
    await expect(card).toContainText("Graham Center");
    await waitForIdle(page);
    const cardBox = (await card.boundingBox())!;
    const dotBox = (await page.locator('[data-stop-id="graham-center"] .stop-marker-dot').boundingBox())!;
    expect(overlaps(cardBox, dotBox), "the selected stop should stay visible beside the card").toBe(false);
    await shot(page, info, "card-graham-center");
  });

  test("Bell Chapel shows its construction badge; Next walks the route", async ({ page }, info) => {
    await openMap(page);
    await page.getByRole("button", { name: /stop 3 of 32/i }).click();
    await expect(page.getByRole("dialog")).toContainText("Under construction");
    await waitForIdle(page);
    await shot(page, info, "card-bell-chapel");
    await page.getByRole("button", { name: /next stop: academic health center 1: center for children and families/i }).click();
    await expect(page.getByRole("dialog")).toContainText("Stop 4 of 32");
  });

  test("stop list opens, scrolls and selects", async ({ page }, info) => {
    await openMap(page);
    await page.getByRole("button", { name: "Stops" }).click();
    const list = page.getByRole("region", { name: "Tour stops" });
    await expect(list.getByRole("list", { name: /driving route/i }).getByRole("button")).toHaveCount(32);
    await shot(page, info, "stop-list");
    await list.getByRole("button", { name: /pitbull stadium/i }).click();
    await expect(page.getByRole("dialog")).toContainText("Pitbull Stadium");
    await expect(list).toHaveCount(0);
  });

  test("keyboard: tab to a marker, open, Escape back", async ({ page }) => {
    await openMap(page);
    await page.locator('[data-stop-id="student-academic-success-center"]').focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toContainText("Student Academic Success Center");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator('[data-stop-id="student-academic-success-center"]')).toBeFocused();
  });
});
