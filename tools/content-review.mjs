#!/usr/bin/env node
// Builds docs/CONTENT-REVIEW.md from content/: every card as guests see and hear it, plus every fact flagged
// for Foundation confirmation. Run with `npm run content:review` after any content change.
// (Edit mode's save function refreshes it automatically for edits made in the browser.)
import { readFileSync, writeFileSync } from "node:fs";
import { buildContentReview } from "./content-review-lib.mjs";

const stops = JSON.parse(readFileSync("content/stops.json", "utf8"));
const tour = JSON.parse(readFileSync("content/tour.json", "utf8"));
const { doc, cards, flagged } = buildContentReview(stops, tour);
const PATH = "docs/CONTENT-REVIEW.md";

if (process.argv.includes("--check")) {
  // Used by the test suite: fail if the page no longer matches content/.
  let current = "";
  try {
    current = readFileSync(PATH, "utf8").replace(/\r\n/g, "\n");
  } catch {
    // missing file counts as out of date
  }
  if (current !== doc) {
    console.error(`${PATH} is out of date. Run: npm run content:review`);
    process.exit(1);
  }
  console.log(`${PATH} is up to date`);
} else {
  writeFileSync(PATH, doc);
  console.log(`${PATH}: ${cards} cards, ${flagged} with items to confirm`);
}
