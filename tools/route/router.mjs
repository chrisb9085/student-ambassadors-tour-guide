// Build a drivable road graph from the extracted Mapbox road features and route through ordered waypoints.
// Usage: node router.mjs <features.json> <waypoints.json> <out.geojson> <roads-out.geojson>
import { readFileSync, writeFileSync } from "node:fs";
const [featFile, wpFile, outFile, roadsOut] = process.argv.slice(2);
const d = JSON.parse(readFileSync(featFile, "utf8"));
const wps = JSON.parse(readFileSync(wpFile, "utf8"));

const DRIVE = new Set(["street", "street_limited", "service", "tertiary", "secondary", "primary", "tertiary_link", "secondary_link", "primary_link"]);
const BOX = { w: -80.388, e: -80.364, s: 25.743, n: 25.768 };
const key = ([x, y]) => `${x.toFixed(5)},${y.toFixed(5)}`;
const nodes = new Map(); // key -> [lng,lat]
const adj = new Map(); // key -> Map(key -> cost)
const R = 6371000;
const dist = (a, b) => {
  const dx = (b[0] - a[0]) * Math.cos(((a[1] + b[1]) / 2) * Math.PI / 180);
  const dy = b[1] - a[1];
  return Math.hypot(dx, dy) * Math.PI / 180 * R;
};
const roadLines = [];
for (const r of d.roads) {
  if (!DRIVE.has(r.cls)) continue;
  const parking = r.type === "service:parking_aisle";
  const lines = r.g.type === "LineString" ? [r.g.coordinates] : r.g.coordinates;
  for (const line of lines) {
    if (!line.some(([x, y]) => x > BOX.w && x < BOX.e && y > BOX.s && y < BOX.n)) continue;
    roadLines.push({ type: "Feature", properties: { cls: r.cls, parking }, geometry: { type: "LineString", coordinates: line } });
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i], b = line[i + 1];
      const ka = key(a), kb = key(b);
      if (ka === kb) continue;
      nodes.set(ka, a); nodes.set(kb, b);
      // Parking aisles cost more so routes stay on roads unless a waypoint forces a lot.
      const c = dist(a, b) * (parking ? 3 : r.cls === "service" ? 1.3 : 1);
      if (!adj.has(ka)) adj.set(ka, new Map());
      if (!adj.has(kb)) adj.set(kb, new Map());
      adj.get(ka).set(kb, Math.min(c, adj.get(ka).get(kb) ?? Infinity));
      adj.get(kb).set(ka, Math.min(c, adj.get(kb).get(ka) ?? Infinity));
    }
  }
}
// Tile clipping splits lines at tile edges: join endpoints that are within 2 m of each other.
const keys = [...nodes.keys()];
const grid = new Map();
for (const k of keys) { const [x, y] = nodes.get(k); const g = `${Math.round(x * 5e4)},${Math.round(y * 5e4)}`; (grid.get(g) ?? grid.set(g, []).get(g)).push(k); }
let joins = 0;
for (const k of keys) {
  const [x, y] = nodes.get(k);
  const gx = Math.round(x * 5e4), gy = Math.round(y * 5e4);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const k2 of grid.get(`${gx + i},${gy + j}`) ?? []) {
    if (k2 <= k) continue;
    const dd = dist(nodes.get(k), nodes.get(k2));
    if (dd < 2 && !adj.get(k).has(k2)) { adj.get(k).set(k2, dd); adj.get(k2).set(k, dd); joins++; }
  }
}

function nearest(p) {
  let best = null, bd = Infinity;
  for (const [k, c] of nodes) { const dd = dist(p, c); if (dd < bd && adj.get(k).size) { bd = dd; best = k; } }
  return [best, bd];
}
function dijkstra(src, dst) {
  const D = new Map([[src, 0]]), prev = new Map(), done = new Set();
  const pq = [[0, src]];
  while (pq.length) {
    let mi = 0; for (let i = 1; i < pq.length; i++) if (pq[i][0] < pq[mi][0]) mi = i;
    const [du, u] = pq.splice(mi, 1)[0];
    if (done.has(u)) continue; done.add(u);
    if (u === dst) break;
    for (const [v, c] of adj.get(u)) { const nd = du + c; if (nd < (D.get(v) ?? Infinity)) { D.set(v, nd); prev.set(v, u); pq.push([nd, v]); } }
  }
  if (!D.has(dst)) return null;
  const path = [dst]; while (path[0] !== src) path.unshift(prev.get(path[0]));
  return path;
}

const coords = [];
const report = [];
let prevKey = null;
for (const wp of wps) {
  const [k, off] = nearest(wp.c);
  report.push(`${wp.n ?? ""} snap ${off.toFixed(1)} m`);
  if (prevKey && prevKey !== k) {
    const p = dijkstra(prevKey, k);
    if (!p) { console.error("NO PATH to", wp.n, wp.c); process.exit(1); }
    for (const pk of p.slice(coords.length ? 1 : 0)) coords.push(nodes.get(pk));
  } else if (!prevKey) coords.push(nodes.get(k));
  prevKey = k;
}
const rounded = coords.map(([x, y]) => [+x.toFixed(6), +y.toFixed(6)]);
let len = 0; for (let i = 1; i < rounded.length; i++) len += dist(rounded[i - 1], rounded[i]);
writeFileSync(outFile, JSON.stringify({ type: "Feature", properties: { name: "FIU donor driving tour" }, geometry: { type: "LineString", coordinates: rounded } }));
if (roadsOut) writeFileSync(roadsOut, JSON.stringify({ type: "FeatureCollection", features: roadLines }));
console.log(`nodes ${nodes.size}, joins ${joins}, route points ${rounded.length}, length ${(len / 1000).toFixed(2)} km`);
console.log(report.filter((r) => parseFloat(r.split("snap ")[1]) > 25).join("\n") || "all waypoints within 25 m of a road");
