import type { Page } from "@playwright/test";

/** Loads the app and waits until the Mapbox style and the visible tiles have loaded. */
export async function openMap(page: Page, path = "/") {
  await page.goto(path);
  await page.waitForFunction(() => {
    const m = (window as unknown as { __tourMap?: { isStyleLoaded(): boolean } }).__tourMap;
    return !!m && m.isStyleLoaded();
  });
}

/** Waits for the camera to stop and tiles to finish loading. */
export async function waitForIdle(page: Page) {
  await page.waitForFunction(() => {
    const m = (window as unknown as { __tourMap?: { isMoving(): boolean; areTilesLoaded(): boolean } }).__tourMap;
    return !!m && !m.isMoving() && m.areTilesLoaded();
  });
}

/** Runs a function against the live map in the page. */
export function onMap<T>(page: Page, fn: string): Promise<T> {
  return page.evaluate((src) => {
    const m = (window as unknown as { __tourMap: unknown }).__tourMap;
    return new Function("map", `return (${src})(map)`)(m);
  }, fn) as Promise<T>;
}

/** Records failed Mapbox requests by status and path only: URLs carry the token. */
export function trackMapboxErrors(page: Page) {
  const errors: string[] = [];
  page.on("response", (r) => {
    if (r.url().includes("mapbox.com") && r.status() >= 400) errors.push(`${r.status()} ${new URL(r.url()).pathname}`);
  });
  return errors;
}
