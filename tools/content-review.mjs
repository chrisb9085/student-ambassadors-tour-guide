#!/usr/bin/env node
// Builds docs/CONTENT-REVIEW.md from content/: every card as guests see and hear it, plus every fact flagged
// for Foundation confirmation. Run with `npm run content:review` after any content change.
import { readFileSync, writeFileSync } from "node:fs";

const stops = JSON.parse(readFileSync("content/stops.json", "utf8"));
const tour = JSON.parse(readFileSync("content/tour.json", "utf8"));
const routeStops = stops.filter((s) => s.order !== null).sort((a, b) => a.order - b.order);
const others = stops.filter((s) => s.order === null);

const typeLabel = { featured: "Featured", "quick-pass": "Quick pass", "also-on-campus": "Also on campus" };
const link = (src) => (src.startsWith("http") ? `[${new URL(src).hostname}${new URL(src).pathname}](${src})` : src);
const words = (s) => (s || "").trim().split(/\s+/).filter(Boolean).length;

function card(heading, c, meta) {
  const lines = [`### ${heading}`, ""];
  if (meta) lines.push(meta, "");
  lines.push(`**Summary:** ${c.summary}`, "");
  if (c.highlights?.length) lines.push("**Highlights:**", "", ...c.highlights.map((h) => `- ${h}`), "");
  lines.push(`**Impact of support:** ${c.impact}`, "");
  if (c.stat) lines.push(`**Key stat:** ${c.stat.value} (${c.stat.label})`, "");
  if (c.narration) lines.push(`**Spoken narration** (${words(c.narration)} words):`, "", `> ${c.narration}`, "");
  if (c.guideNotes?.length)
    lines.push(
      "**For ambassadors** (collapsed on the card, never read aloud):",
      "",
      ...c.guideNotes.map((g) => `- *${g.kind === "tip" ? "Tour guide tip" : "Detail"}* (${link(g.source)}): ${g.text}`),
      "",
    );
  lines.push(`**Sources:** ${c.sources.map(link).join("; ")}`, "", `**Last reviewed:** ${c.lastReviewed}`, "");
  if (c.reviewNotes?.length) lines.push("**Needs confirmation:**", "", ...c.reviewNotes.map((n) => `- ${n}`), "");
  return lines.join("\n");
}

const flagged = [
  ...[["Welcome", tour.welcome], ...routeStops.map((s) => [`${s.order}. ${s.name}`, s]), ...others.map((s) => [s.name, s]), ["Closing", tour.closing]],
].filter(([, c]) => c.reviewNotes?.length);

const out = [
  "# Tour content for Foundation review",
  "",
  "This document shows every card in the FIU donor driving tour exactly as guests see it and as Tour Mode reads it aloud, with the source for each fact, plus the study notes ambassadors see under \"For ambassadors\". It is generated from `content/` with `npm run content:review`, so edit the content files, not this page.",
  "",
  "**How to review:** read each card, and check the items under \"Needs confirmation\" first. Send corrections, or a confirmed fact with its source, to the Student Ambassador team.",
  "",
  `## Needs confirmation (${flagged.reduce((n, [, c]) => n + c.reviewNotes.length, 0)} items)`,
  "",
  ...flagged.flatMap(([name, c]) => c.reviewNotes.map((n) => `- **${name}:** ${n}`)),
  "",
  "## Welcome",
  "",
  card(tour.welcome.title, tour.welcome, "Start: the loop between Gold Garage (PG1) and Blue Garage (PG2), in front of MARC."),
  "## Route stops, in driving order",
  "",
  ...routeStops.map((s) =>
    card(
      `${s.order}. ${s.name}`,
      s,
      `*${typeLabel[s.type]}${s.status === "under-construction" ? ` · Under construction${s.opens ? `, opens ${s.opens}` : ""}` : ""} · Building code ${s.code}*`,
    ),
  ),
  "## Also on campus",
  "",
  ...others.map((s) => card(s.name, s, `*${typeLabel[s.type]} · Not on the driving route · Building code ${s.code}*`)),
  "## Closing",
  "",
  card(tour.closing.title, tour.closing),
];

const doc = out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
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
  console.log(`${PATH}: ${routeStops.length + others.length + 2} cards, ${flagged.length} with items to confirm`);
}
