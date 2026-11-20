import { test as base } from "@playwright/test";
import standInStyle from "./standin-style.json" with { type: "json" };

export { expect } from "@playwright/test";

/** Tag for the few tests that load real Mapbox tiles. They run in the "real-map" project only. */
export const REAL_MAP = "@real-map";

/** Any Mapbox host: api, events, tiles. */
const MAPBOX = /^https:\/\/([a-z0-9-]+\.)*mapbox\.com\//;

type Options = {
  /** Load real Mapbox style and tiles instead of the local stand-in. Off by default. */
  realTiles: boolean;
};

type Fixtures = {
  /**
   * Paths (never full URLs: they carry the token) of the Mapbox requests the stand-in answered.
   * Empty when realTiles is on.
   */
  mapboxRequests: string[];
};

/**
 * Most end-to-end tests check the app (markers, cards, tour, focus, layout), not the satellite imagery.
 * By default every request to Mapbox is answered locally: the style request gets a one-layer stand-in
 * style with no tile sources, and anything else (telemetry, billing) gets an empty reply. The map still
 * runs for real (camera, bounds, route layers, markers), but nothing reaches Mapbox, so test runs cost
 * no map loads and can't hit Mapbox's rate limit.
 */
export const test = base.extend<Options & Fixtures>({
  realTiles: [false, { option: true }],
  mapboxRequests: [
    async ({ context, realTiles }, use) => {
      const seen: string[] = [];
      if (!realTiles) {
        await context.route(MAPBOX, (route) => {
          const { pathname } = new URL(route.request().url());
          seen.push(pathname);
          if (pathname.startsWith("/styles/v1/")) return route.fulfill({ json: standInStyle });
          return route.fulfill({ status: 204 });
        });
      }
      await use(seen);
    },
    { auto: true },
  ],
});
