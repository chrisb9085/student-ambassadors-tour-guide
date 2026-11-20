import { expect, test } from "@playwright/test";
import { URLS } from "./urls";
import { onMap, openMap, trackMapboxErrors, waitForIdle } from "./helpers";

test.describe("Sprint 0-1: app shell and map", () => {
  test("shows setup steps instead of the map when no token is configured", async ({ page }) => {
    await page.goto(URLS.NO_TOKEN);
    await expect(page.getByRole("alert")).toContainText("The campus map can't load");
    await expect(page.locator(".mapboxgl-canvas")).toHaveCount(0);
  });

  test("loads the satellite map with no Mapbox errors", async ({ page }) => {
    const errors = trackMapboxErrors(page);
    await openMap(page);
    await waitForIdle(page);
    await expect(page.locator(".mapboxgl-canvas")).toBeVisible();
    await expect(page.getByRole("region", { name: /satellite map of fiu/i })).toBeVisible();
    // Attribution is required by Mapbox terms.
    await expect(page.locator(".mapboxgl-ctrl-attrib")).toContainText("Mapbox");
    expect(errors, "Mapbox requests should all succeed").toEqual([]);
  });

  test("camera buttons are at least 44 px and work", async ({ page }) => {
    await openMap(page);
    for (const name of [/whole route/i, /reset view/i]) {
      const box = await page.getByRole("button", { name }).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }

    await page.getByRole("button", { name: /whole route/i }).click();
    await waitForIdle(page);
    const zoomAfterFit = await onMap<number>(page, "(m) => m.getZoom()");

    await onMap(page, "(m) => m.jumpTo({ zoom: 18 })");
    await page.getByRole("button", { name: /reset view/i }).click();
    await waitForIdle(page);
    expect(await onMap<number>(page, "(m) => Math.round(m.getZoom() * 10) / 10")).toBe(15.6);
    expect(zoomAfterFit).toBeGreaterThan(14.4);
  });

  test("can't pan away from campus", async ({ page }) => {
    await openMap(page);
    // Try to jump north-east, then south-west, well off campus.
    await onMap(page, "(m) => m.jumpTo({ center: [-80.2, 25.9] })");
    const [lng1, lat1] = await onMap<[number, number]>(page, "(m) => m.getCenter().toArray()");
    expect(lng1).toBeLessThanOrEqual(-80.364 + 1e-6);
    expect(lat1).toBeLessThanOrEqual(25.767 + 1e-6);
    await onMap(page, "(m) => m.jumpTo({ center: [-80.5, 25.6] })");
    const [lng2, lat2] = await onMap<[number, number]>(page, "(m) => m.getCenter().toArray()");
    expect(lng2).toBeGreaterThanOrEqual(-80.388 - 1e-6);
    expect(lat2).toBeGreaterThanOrEqual(25.744 - 1e-6);
  });
});

test.describe("Sprint 2: route and stops", () => {
  test("draws the route with arrows and a start/finish marker", async ({ page }, info) => {
    await openMap(page);
    await page.getByRole("button", { name: /whole route/i }).click();
    await waitForIdle(page);
    const layers = await onMap<string[]>(page, "(m) => m.getStyle().layers.map((l) => l.id).filter((id) => id.startsWith('tour-route'))");
    expect(layers).toEqual(["tour-route-casing", "tour-route-line", "tour-route-arrows"]);
    // The route line is actually rendered on screen.
    const rendered = await onMap<number>(page, "(m) => m.queryRenderedFeatures({ layers: ['tour-route-line'] }).length");
    expect(rendered).toBeGreaterThan(0);
    await expect(page.getByRole("img", { name: /start and finish/i })).toBeVisible();
    await page.screenshot({ path: info.outputPath("whole-route.png") });
    await info.attach("whole-route", { path: info.outputPath("whole-route.png"), contentType: "image/png" });
  });
});
