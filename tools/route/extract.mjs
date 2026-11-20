/* global window */
// Pull POI labels, buildings and roads for campus from the live map's vector tiles.
import { createRequire } from "node:module";
import { join } from "node:path";
import { writeFileSync } from "node:fs";
const [root, outDir] = process.argv.slice(2);
const require = createRequire(join(root, "package.json"));
const { chromium } = require("@playwright/test");
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1800, height: 1400 } });
await page.goto("http://localhost:5173/");
await page.waitForFunction(() => window.__tourMap, null, { timeout: 30000 });
const result = { pois: [], roads: [], buildings: [] };
// Sample a few views so every tile at z16 is loaded.
for (const c of [[-80.38, 25.759], [-80.371, 25.759], [-80.38, 25.752], [-80.371, 25.752]]) {
  await page.evaluate((c) => { const m = window.__tourMap; m.setMaxBounds(null); m.jumpTo({ center: c, zoom: 16.2 }); }, c);
  await page.waitForFunction(() => !window.__tourMap.isMoving() && window.__tourMap.isStyleLoaded(), null, { timeout: 30000 });
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => {
    const m = window.__tourMap;
    const q = (layer) => m.querySourceFeatures("composite", { sourceLayer: layer });
    return {
      pois: q("poi_label").map((f) => ({ name: f.properties.name, cls: f.properties.class, type: f.properties.type, c: f.geometry.coordinates })),
      roads: q("road").filter((f) => f.geometry.type.includes("LineString")).map((f) => ({ cls: f.properties.class, type: f.properties.type, name: f.properties.name, oneway: f.properties.oneway, g: f.geometry })),
      buildings: q("building").map((f) => ({ g: f.geometry, h: f.properties.height })),
    };
  });
  result.pois.push(...r.pois); result.roads.push(...r.roads); result.buildings.push(...r.buildings);
}
const seen = new Set();
result.pois = result.pois.filter((p) => { const k = p.name + p.c; if (seen.has(k)) return false; seen.add(k); return true; });
writeFileSync(join(outDir, "mapbox-features.json"), JSON.stringify(result));
console.log("pois", result.pois.length, "roads", result.roads.length, "buildings", result.buildings.length);
await browser.close();
