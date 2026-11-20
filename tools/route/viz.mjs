/* global window, document */
// Usage: node viz.mjs <root> <out.png> <lng> <lat> <zoom> <step> <w> <h> [roads.geojson|-] [route.geojson|-] [points.json|-]
import { createRequire } from "node:module";
import { join } from "node:path";
import { readFileSync, existsSync } from "node:fs";
const [root, out, lng, lat, zoom, step, w, h, roadsF, routeF, ptsF] = process.argv.slice(2);
const load = (f) => (f && f !== "-" && existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null);
const roads = load(roadsF), route = load(routeF), pts = load(ptsF) ?? [];
const require = createRequire(join(root, "package.json"));
const { chromium } = require("@playwright/test");
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
await page.goto("http://localhost:5173/");
await page.waitForFunction(() => window.__tourMap && window.__tourMap.isStyleLoaded() && !window.__tourMap.isMoving(), null, { timeout: 30000 }); await page.waitForTimeout(500);
await page.evaluate(([lng, lat, zoom, roads, route]) => {
  const m = window.__tourMap;
  m.setMaxBounds(null);
  m.jumpTo({ center: [lng, lat], zoom });
  if (roads) { m.addSource("dbg-roads", { type: "geojson", data: roads }); m.addLayer({ id: "dbg-roads", type: "line", source: "dbg-roads", paint: { "line-color": ["case", ["get", "parking"], "#3a6", "#2cf"], "line-width": 1.5 } }); }
  if (route) {
    m.addSource("dbg-route", { type: "geojson", data: route });
    m.addLayer({ id: "dbg-route", type: "line", source: "dbg-route", paint: { "line-color": "#fb2", "line-width": 4, "line-opacity": 0.85 } });
    m.addLayer({ id: "dbg-arrows", type: "symbol", source: "dbg-route", layout: { "symbol-placement": "line", "symbol-spacing": 60, "text-field": "▶", "text-size": 14, "text-keep-upright": false, "text-allow-overlap": true }, paint: { "text-color": "#000" } });
  }
}, [+lng, +lat, +zoom, roads, route]);
await page.waitForFunction(() => !window.__tourMap.isMoving() && window.__tourMap.loaded(), null, { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(2500);
await page.evaluate(([step, pts]) => {
  document.querySelectorAll(".app-title,.map-controls").forEach((e) => (e.style.display = "none"));
  const m = window.__tourMap, b = m.getBounds();
  const L = document.createElement("div");
  L.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:99;font:bold 11px monospace";
  const dec = step < 0.001 ? 4 : 3;
  for (let x = Math.ceil(b.getWest() / step) * step; x < b.getEast(); x += step) { const px = m.project([x, b.getCenter().lat]).x; L.insertAdjacentHTML("beforeend", `<div style="position:absolute;left:${px}px;top:0;bottom:0;width:1px;background:rgba(255,255,255,.25)"></div><div style="position:absolute;left:${px + 2}px;top:2px;color:#fff;background:#000c">${x.toFixed(dec)}</div>`); }
  for (let y = Math.ceil(b.getSouth() / step) * step; y < b.getNorth(); y += step) { const py = m.project([b.getCenter().lng, y]).y; L.insertAdjacentHTML("beforeend", `<div style="position:absolute;top:${py}px;left:0;right:0;height:1px;background:rgba(255,255,255,.25)"></div><div style="position:absolute;top:${py + 2}px;left:2px;color:#fff;background:#000c">${y.toFixed(dec)}</div>`); }
  for (const p of pts) { const { x, y } = m.project(p.c); L.insertAdjacentHTML("beforeend", `<div style="position:absolute;left:${x - 6}px;top:${y - 6}px;width:12px;height:12px;border-radius:50%;background:${p.col ?? "#f0f"};border:2px solid #fff"></div><div style="position:absolute;left:${x + 8}px;top:${y - 7}px;color:#fff;background:${p.col ?? "#a0a"};padding:0 3px;font-size:12px">${p.n}</div>`); }
  document.body.appendChild(L);
}, [+step, pts]);
await page.screenshot({ path: out });
await browser.close();
console.log("saved", out);

