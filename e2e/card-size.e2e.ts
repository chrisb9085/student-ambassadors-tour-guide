import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { openMap, waitForIdle } from "./helpers";

const sidePanel = (page: Page) => {
  const { width, height } = page.viewportSize()!;
  return width > height && width >= 640;
};

/** Drags the card's grab handle by dy px. */
async function dragHandle(page: Page, dy: number, steps = 12) {
  const box = (await page.locator(".sheet-handle").boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + dy, { steps });
  await page.mouse.up();
}

test.describe("Admin button", () => {
  test("sits beside the title, clear of the camera buttons, and opens Edit mode", async ({ page }) => {
    await openMap(page);
    const admin = page.getByRole("link", { name: "Admin" });
    const title = (await page.locator(".app-title").boundingBox())!;
    const box = (await admin.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    if (page.viewportSize()!.width >= 520) {
      // Beside the title.
      expect(Math.abs(box.y + box.height / 2 - (title.y + title.height / 2))).toBeLessThan(2);
      expect(box.x).toBeGreaterThan(title.x + title.width);
    } else {
      // Narrow phones: just under it.
      expect(box.x).toBe(title.x);
      expect(box.y).toBeGreaterThan(title.y + title.height);
    }
    const controls = (await page.locator(".map-controls").boundingBox())!;
    expect(box.x + box.width).toBeLessThan(controls.x);
    await admin.click();
    await expect(page).toHaveURL(/\?view=edit/);
  });
});

test.describe("Expanding a stop card", () => {
  test("the Expand button gives the card more room and keeps the building in view", async ({ page }, info) => {
    await openMap(page);
    await page.getByRole("button", { name: /2 graham center, stop 2 of 32/i }).click();
    const card = page.getByRole("dialog");
    const before = (await card.boundingBox())!;
    await card.getByRole("button", { name: "Expand card" }).click();
    await expect(card).toHaveAttribute("data-size", "full");
    await waitForIdle(page);
    const after = (await card.boundingBox())!;
    const vp = page.viewportSize()!;
    if (sidePanel(page)) {
      // Half the screen; the map keeps the other half, with the building in it.
      expect(after.width).toBeGreaterThan(before.width);
      expect(Math.abs(after.x + after.width - vp.width / 2)).toBeLessThan(4);
      const dot = (await page.locator('[data-stop-id="graham-center"] .stop-marker-dot').boundingBox())!;
      expect(dot.x).toBeGreaterThan(after.x + after.width);
    } else {
      expect(after.height).toBeGreaterThan(vp.height * 0.9);
    }
    const path = info.outputPath("card-expanded.png");
    await page.screenshot({ path });
    await info.attach("card-expanded", { path, contentType: "image/png" });
    await card.getByRole("button", { name: "Shrink card" }).click();
    await expect(card).toHaveAttribute("data-size", "normal");
  });

  test("on phones and portrait tablets the card can be swiped up and down", async ({ page }) => {
    await openMap(page);
    await page.getByRole("button", { name: /2 graham center, stop 2 of 32/i }).click();
    const card = page.getByRole("dialog");
    if (sidePanel(page)) {
      await expect(page.locator(".sheet-handle")).toHaveCount(0);
      return;
    }
    await dragHandle(page, -300);
    await expect(card).toHaveAttribute("data-size", "full");
    await dragHandle(page, 300);
    await expect(card).toHaveAttribute("data-size", "normal");
    // Down again: only the title and Previous/Next stay, so the map shows.
    await dragHandle(page, 300);
    await expect(card).toHaveAttribute("data-size", "peek");
    await expect(card.getByRole("tab", { name: /info/i })).toBeHidden();
    await expect(card.getByRole("button", { name: /next stop/i })).toBeVisible();
    // Back up. (Quick flicks are covered by the unit tests: their speed isn't reliable on a busy test machine.)
    await dragHandle(page, -300);
    await expect(card).toHaveAttribute("data-size", "normal");
    // A tap on the handle expands.
    await page.locator(".sheet-handle").click();
    await expect(card).toHaveAttribute("data-size", "full");
  });
});
