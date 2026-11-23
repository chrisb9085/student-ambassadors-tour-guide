import { expect, REAL_MAP, test } from "./fixtures";
import { URLS } from "./urls";
import { onMap, openMap, trackMapboxErrors, waitForIdle, waitForMap } from "./helpers";

test.describe("Sprint 0-1: app shell and map", () => {
  test("shows setup steps instead of the map when no token is configured", async ({ page }) => {
    await page.goto(URLS.NO_TOKEN);
    await expect(page.getByRole("alert")).toContainText("The campus map can't load");
    await expect(page.locator(".mapboxgl-canvas")).toHaveCount(0);
  });

  test("the map runs on the stand-in without any request reaching Mapbox", async ({ page, mapboxRequests }) => {
    await openMap(page);
    await waitForIdle(page);
    await expect(page.locator(".mapboxgl-canvas")).toBeVisible();
    await expect(page.getByRole("region", { name: /satellite map of fiu/i })).toBeVisible();
    // Only the style was asked for (answered locally); no tile, sprite or font requests.
    expect(mapboxRequests.filter((p) => p.startsWith("/styles/v1/"))).toHaveLength(1);
    expect(mapboxRequests.filter((p) => /tiles|sprite|fonts|\.pbf|\.png|\.webp/.test(p))).toEqual([]);
  });

  test("camera buttons are at least 44 px and work", async ({ page }) => {
    await openMap(page);
    await waitForIdle(page);
    // The default view depends on screen size (phones zoom out to fit the route).
    const openingZoom = await onMap<number>(page, "(m) => Math.round(m.getZoom() * 10) / 10");
    // No double-tap-to-zoom delay on controls (Sprint 12).
    expect(await page.getByRole("button", { name: /whole route/i }).evaluate((el) => getComputedStyle(el).touchAction)).toBe("manipulation");
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
    expect(await onMap<number>(page, "(m) => Math.round(m.getZoom() * 10) / 10")).toBe(openingZoom);
    expect(openingZoom).toBeLessThanOrEqual(15.6);
    expect(zoomAfterFit).toBeGreaterThan(14.4);
  });

  test("the opening view shows every route stop, on any screen size", async ({ page }) => {
    await openMap(page);
    await waitForIdle(page);
    const viewport = page.viewportSize()!;
    const offscreen = await page.locator(".stop-marker--featured, .stop-marker--quick-pass").evaluateAll(
      (els, vp) =>
        els
          .map((el) => ({ id: (el as HTMLElement).dataset.stopId, r: el.querySelector(".stop-marker-dot")!.getBoundingClientRect() }))
          .filter(({ r }) => r.right < 0 || r.left > vp.width || r.bottom < 0 || r.top > vp.height)
          .map(({ id }) => id),
      viewport,
    );
    expect(offscreen, "stops outside the opening view").toEqual([]);
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
  test("draws the route with arrows and a start/finish marker", async ({ page }) => {
    await openMap(page);
    await page.getByRole("button", { name: /whole route/i }).click();
    await waitForIdle(page);
    const layers = await onMap<string[]>(page, "(m) => m.getStyle().layers.map((l) => l.id).filter((id) => id.startsWith('tour-route'))");
    expect(layers).toEqual(["tour-route-casing", "tour-route-line", "tour-route-arrows"]);
    // The route line is actually rendered on screen.
    const rendered = await onMap<number>(page, "(m) => m.queryRenderedFeatures({ layers: ['tour-route-line'] }).length");
    expect(rendered).toBeGreaterThan(0);
    await expect(page.getByRole("img", { name: /start and finish/i })).toBeVisible();
  });
});

test.describe("Mapbox logo and attribution", () => {
  test("stay visible top-right, clear of the camera buttons, open panels and the tour bar", async ({ page }) => {
    await openMap(page);
    const corner = page.locator(".mapboxgl-ctrl-top-right");
    await expect(corner.locator(".mapboxgl-ctrl-logo")).toBeAttached();
    await expect(corner.locator(".mapboxgl-ctrl-attrib")).toBeAttached();
    const overlaps = async (selector: string) => {
      const a = await corner.boundingBox();
      const b = await page.locator(selector).first().boundingBox();
      if (!a || !b) return false;
      return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    };
    expect(await overlaps(".app-title")).toBe(false);
    expect(await overlaps(".map-controls")).toBe(false);
    await page.getByRole("button", { name: "Stops" }).click();
    await expect(page.locator(".panel")).toBeVisible();
    expect(await overlaps(".panel")).toBe(false);
  });
});

/**
 * The only tests that load real Mapbox tiles (two map loads per run), in the "real-map" project:
 * npm run test:e2e:real. They skip when .env.local has no token.
 */
test.describe("Real map tiles", { tag: REAL_MAP }, () => {
  test.use({ realTiles: true });
  let errors: string[] = [];
  test.beforeEach(async ({ page }) => {
    errors = trackMapboxErrors(page);
    await page.goto("/");
    await page.locator(".mapboxgl-canvas, [role=alert]").first().waitFor();
    test.skip(await page.getByRole("alert").isVisible(), "No Mapbox token in .env.local");
  });

  test("loads the satellite map with no Mapbox errors", async ({ page }) => {
    await waitForMap(page);
    await waitForIdle(page);
    await expect(page.locator(".mapboxgl-canvas")).toBeVisible();
    // Attribution is required by Mapbox terms.
    await expect(page.locator(".mapboxgl-ctrl-attrib")).toContainText("Mapbox");
    expect(errors, "Mapbox requests should all succeed").toEqual([]);
  });

  test("whole route over satellite imagery (screenshot for review)", async ({ page }, info) => {
    await waitForMap(page);
    await page.getByRole("button", { name: /whole route/i }).click();
    await waitForIdle(page);
    expect(await onMap<number>(page, "(m) => m.queryRenderedFeatures({ layers: ['tour-route-line'] }).length")).toBeGreaterThan(0);
    await page.screenshot({ path: info.outputPath("whole-route.png") });
    await info.attach("whole-route", { path: info.outputPath("whole-route.png"), contentType: "image/png" });
  });
});
