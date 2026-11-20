#!/usr/bin/env node
// Validates content/ for the FIU donor tour. No dependencies.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.cwd();
const BOUNDS = { minLng: -80.386, maxLng: -80.366, minLat: 25.745, maxLat: 25.766 };
const TYPES = ["featured", "quick-pass", "also-on-campus"];
const STATUSES = ["open", "under-construction"];
const REQUIRED = ["id", "order", "code", "name", "type", "status", "coordinates", "summary", "highlights", "impact", "sources", "lastReviewed"];

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

function readJson(rel) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) { warn(`${rel} not found (skipped)`); return null; }
  try { return JSON.parse(readFileSync(p, "utf8")); }
  catch (e) { err(`${rel} is not valid JSON: ${e.message}`); return null; }
}

const inCampus = ([lng, lat]) =>
  typeof lng === "number" && typeof lat === "number" &&
  lng >= BOUNDS.minLng && lng <= BOUNDS.maxLng && lat >= BOUNDS.minLat && lat <= BOUNDS.maxLat;

const words = (s) => (s || "").trim().split(/\s+/).filter(Boolean).length;

// Narration is read aloud: flag things text-to-speech handles badly.
// All-caps words that voices say correctly (as a word or as letters a listener knows).
const SPOKEN_OK = new Set(["FIU", "NCAA", "NBA", "LEED", "STAR", "MARC"]);
function speechWarnings(label, text) {
  if (!text) return;
  if (/[()]/.test(text)) warn(`${label}: narration has parentheses; write it for the ear`);
  const caps = [...new Set(text.match(/\b[A-Z]{2,}\b/g) || [])].filter((w) => !SPOKEN_OK.has(w));
  if (caps.length) warn(`${label}: narration has ${caps.join(", ")}; voices may spell it out (use the spoken name, or add it to SPOKEN_OK)`);
}

// stops.json
const stops = readJson("content/stops.json");
if (stops) {
  if (!Array.isArray(stops)) err("content/stops.json must be an array");
  else {
    const ids = new Set();
    const orders = [];
    for (const s of stops) {
      const label = s.id || s.name || "(unnamed stop)";
      for (const f of REQUIRED) if (!(f in s)) err(`${label}: missing "${f}"`);
      if (s.id && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.id)) err(`${label}: id must be kebab-case`);
      if (ids.has(s.id)) err(`${label}: duplicate id`);
      ids.add(s.id);
      if (!TYPES.includes(s.type)) err(`${label}: type must be one of ${TYPES.join(", ")}`);
      if (!STATUSES.includes(s.status)) err(`${label}: status must be one of ${STATUSES.join(", ")}`);
      if (s.type === "also-on-campus") {
        if (s.order !== null) err(`${label}: also-on-campus stops need "order": null`);
      } else if (!Number.isInteger(s.order)) err(`${label}: route stops need an integer order`);
      else orders.push(s.order);
      if (!Array.isArray(s.coordinates) || s.coordinates.length !== 2 || !inCampus(s.coordinates))
        err(`${label}: coordinates must be [lng, lat] inside campus`);
      if (!s.summary) err(`${label}: empty summary`);
      if (!Array.isArray(s.highlights) || s.highlights.length === 0) err(`${label}: needs highlights`);
      else if (s.highlights.length > 4) warn(`${label}: more than 4 highlights`);
      if (!Array.isArray(s.sources) || s.sources.length === 0) err(`${label}: needs at least one source`);
      if (s.lastReviewed && !/^\d{4}-\d{2}-\d{2}$/.test(s.lastReviewed)) err(`${label}: lastReviewed must be YYYY-MM-DD`);
      const spoken = s.narration || [s.summary, ...(s.highlights || []), s.impact].join(" ");
      const n = words(spoken);
      if (s.type === "featured" && (n < 40 || n > 90)) warn(`${label}: featured narration is ${n} words (target 40 to 90)`);
      if (s.type === "quick-pass" && s.narration && n > 35) warn(`${label}: quick-pass narration is ${n} words (target 35 or fewer)`);
      speechWarnings(label, s.narration);
      if ("guideNotes" in s) {
        if (!Array.isArray(s.guideNotes)) err(`${label}: guideNotes must be an array`);
        else
          s.guideNotes.forEach((g, i) => {
            const where = `${label}: guideNotes[${i}]`;
            if (!["tip", "detail"].includes(g?.kind)) err(`${where}: kind must be "tip" or "detail"`);
            if (!g?.text || typeof g.text !== "string") err(`${where}: empty text`);
            if (!/^Handbook p\.\d+$/.test(g?.source ?? "") && !/^https:\/\/([a-z0-9-]+\.)*fiu\.edu\//.test(g?.source ?? ""))
              err(`${where}: source must be "Handbook p.N" or an fiu.edu URL`);
          });
      }
    }
    orders.sort((a, b) => a - b);
    if (orders.some((o, i) => o !== i + 1)) err(`route order must be consecutive from 1; found ${orders.join(", ")}`);
  }
}

// tour.json
const tour = readJson("content/tour.json");
if (tour)
  for (const k of ["welcome", "closing"]) {
    if (!tour[k]) err(`content/tour.json: missing "${k}"`);
    else speechWarnings(`tour.${k}`, tour[k].narration);
  }

// route.geojson
const route = readJson("content/route.geojson");
if (route) {
  const geom = route.type === "FeatureCollection" ? route.features?.[0]?.geometry
    : route.type === "Feature" ? route.geometry : route;
  if (!geom || geom.type !== "LineString") err("content/route.geojson must contain a single LineString");
  else if (!geom.coordinates.every(inCampus)) err("content/route.geojson has points outside campus");
}

// Token scan (text files outside ignored folders)
// Gitignored build and test output. Playwright snapshots include the map's attribution links, which carry the public token.
const SKIP = new Set(["node_modules", ".git", "dist", ".vercel", "test-results", "playwright-report"]);
const TEXT = new Set([".js", ".mjs", ".ts", ".tsx", ".jsx", ".json", ".md", ".html", ".css", ".geojson", ".yml", ".yaml", ".txt", ""]);
const TOKEN = /\b[ps]k\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/;
function scan(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name) || name.startsWith(".env")) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) scan(p);
    else if (TEXT.has(extname(name)) && st.size < 2_000_000 && TOKEN.test(readFileSync(p, "utf8")))
      err(`possible Mapbox token in ${p.slice(ROOT.length + 1)}; remove it and use VITE_MAPBOX_TOKEN`);
  }
}
scan(ROOT);

for (const w of warnings) console.log(`warning: ${w}`);
for (const e of errors) console.log(`error: ${e}`);
console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
