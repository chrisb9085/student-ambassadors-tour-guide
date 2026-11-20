import AxeBuilder from "@axe-core/playwright";
import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { openMap, waitForIdle } from "./helpers";
import { URLS } from "./urls";

/**
 * Automated accessibility audit (WCAG 2.1 A and AA rules) of each screen state.
 * The Mapbox canvas and its attribution are third-party, so they're excluded from the scan; our own
 * markers inside the map are still checked.
 */
async function audit(page: Page, state: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude(".mapboxgl-canvas-container canvas")
    .exclude(".mapboxgl-ctrl-bottom-left")
    .exclude(".mapboxgl-ctrl-bottom-right")
    .analyze();
  const problems = results.violations.map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node(s): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
  expect(problems, `accessibility problems in state: ${state}`).toEqual([]);
}

test.describe("Sprint 6: accessibility audit", () => {
  test("missing-token screen", async ({ page }) => {
    await page.goto(URLS.NO_TOKEN);
    await audit(page, "missing token");
  });

  // One state per test: axe in software-rendered WebKit is slow, and separate tests report precisely.
  test("map", async ({ page }) => {
    await openMap(page);
    await waitForIdle(page);
    await audit(page, "map");
  });

  test("stop card (Bell Chapel, under construction)", async ({ page }) => {
    await openMap(page);
    await page.getByRole("button", { name: /stop 3 of 32/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await audit(page, "Bell Chapel card");
  });

  test("stop card with For ambassadors open (Academic Health Center 3, long name)", async ({ page }) => {
    await openMap(page);
    await page.getByRole("button", { name: /stop 6 of 32/i }).click();
    await page.getByRole("dialog").getByText("For ambassadors").click();
    await expect(page.getByRole("dialog")).toContainText("Tour guide tip");
    await audit(page, "For ambassadors open");
  });

  test("stop list", async ({ page }) => {
    await openMap(page);
    await page.getByRole("button", { name: "Stops" }).click();
    await expect(page.getByRole("region", { name: "Tour stops" })).toBeVisible();
    await audit(page, "stop list");
  });

  test("start sheet", async ({ page }) => {
    await openMap(page);
    await page.getByRole("button", { name: "Start tour" }).click();
    await expect(page.getByRole("dialog", { name: "Start the tour" })).toBeVisible();
    await audit(page, "start sheet");
  });

  async function startRideAlong(page: Page) {
    await openMap(page);
    await page.getByRole("button", { name: "Start tour" }).click();
    await page.getByRole("button", { name: /ride-along/i }).click();
    await page.getByRole("button", { name: "Next stop" }).click();
    await expect(page.getByRole("region", { name: "Tour controls" })).toContainText("Stop 1 of 32");
  }

  test("tour running", async ({ page }) => {
    await startRideAlong(page);
    await audit(page, "tour");
  });

  test("tour settings", async ({ page }) => {
    await startRideAlong(page);
    await page.getByRole("button", { name: "Tour settings" }).click();
    await audit(page, "tour settings");
  });
});
