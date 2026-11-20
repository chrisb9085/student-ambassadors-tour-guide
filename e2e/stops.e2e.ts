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
  test("37 markers with 44 px touch targets", async ({ page }) => {
    await openMap(page);
    const markers = page.locator(".stop-marker");
    await expect(markers).toHaveCount(37);
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

test.describe("Sprint 10: study tools", () => {
  test("a shared link opens that stop's card, with its marker in view", async ({ page }) => {
    await openMap(page, "/?stop=bell-chapel");
    await expect(page.getByRole("dialog")).toContainText("Trish and Dan Bell Chapel");
    await waitForIdle(page);
    const dot = await page.locator('[data-stop-id="bell-chapel"] .stop-marker-dot').boundingBox();
    const card = await page.getByRole("dialog").boundingBox();
    const vp = page.viewportSize()!;
    expect(dot!.x).toBeGreaterThanOrEqual(0);
    expect(dot!.x + dot!.width).toBeLessThanOrEqual(vp.width);
    // Not hidden under the card (side panel or bottom sheet).
    const overlaps = dot!.x < card!.x + card!.width && dot!.x + dot!.width > card!.x && dot!.y < card!.y + card!.height && dot!.y + dot!.height > card!.y;
    expect(overlaps).toBe(false);
    // Browsing updates the address bar.
    await page.getByRole("button", { name: /next stop:/i }).click();
    await expect(page).toHaveURL(/\?stop=center-for-children-and-families$/);
  });

  test("off-route stops are on the map, with Shaham under construction", async ({ page }) => {
    await openMap(page);
    await page.getByRole("button", { name: /shaham medical center/i }).click();
    await expect(page.getByRole("dialog")).toContainText("Under construction · Opens 2028");
    await expect(page.getByRole("dialog")).toContainText("Also on campus");
  });

  test("study guide: opens from the stop list, lists every stop, and prints without its buttons", async ({ page }, info) => {
    await openMap(page);
    await page.getByRole("button", { name: "Stops" }).click();
    await page.getByRole("link", { name: "Printable study guide" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Study guide" })).toBeVisible();
    await expect(page.locator(".mapboxgl-canvas")).toHaveCount(0);
    await expect(page.locator("article.guide-stop")).toHaveCount(2 + 32 + 5);
    await shot(page, info, "study-guide");
    await page.emulateMedia({ media: "print" });
    await expect(page.getByRole("button", { name: "Print" })).toBeHidden();
    await expect(page.getByRole("link", { name: /show on map/i }).first()).toBeHidden();
    await page.emulateMedia({ media: "screen" });
    await page.getByRole("link", { name: /show on map: ernest r\. graham center/i }).click();
    await expect(page.getByRole("dialog")).toContainText("Ernest R. Graham Center");
  });
});
