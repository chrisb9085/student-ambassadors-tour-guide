/**
 * What Edit mode may change on a stop, and the rules an edit must pass. Shared by the browser (to show problems
 * before saving) and by the save function in api/admin/save.ts (which never trusts the browser and checks again).
 *
 * Edit mode changes words only. Ids, building codes, route order, type and map coordinates change how the map and
 * route are built, so they stay with whoever maintains the code (see the add-tour-stop skill).
 */
import type { GuideNote, Stop, StopStatus } from "../content/types.js";

export type StopEdit = {
  name: string;
  label: string | null;
  status: StopStatus;
  opens: string | null;
  summary: string;
  highlights: string[];
  impact: string;
  stat: { value: string; label: string } | null;
  narration: string | null;
  sources: string[];
  guideNotes: GuideNote[];
  reviewNotes: string[];
};

export const LIMITS = {
  name: 140,
  label: 40,
  opens: 20,
  summary: 400,
  highlight: 220,
  maxHighlights: 4,
  impact: 600,
  statValue: 20,
  statLabel: 60,
  narration: 1200,
  source: 300,
  maxSources: 10,
  note: 600,
  maxNotes: 20,
} as const;

/** The editable part of a stop, as the form starts out. */
export function editableFrom(stop: Stop): StopEdit {
  return {
    name: stop.name,
    label: stop.label ?? null,
    status: stop.status,
    opens: stop.opens,
    summary: stop.summary,
    highlights: [...stop.highlights],
    impact: stop.impact,
    stat: stop.stat ? { ...stop.stat } : null,
    narration: stop.narration,
    sources: [...stop.sources],
    guideNotes: (stop.guideNotes ?? []).map((g) => ({ ...g })),
    reviewNotes: [...(stop.reviewNotes ?? [])],
  };
}

const HANDBOOK_SOURCE = /^Handbook p\.\d+$/;
const FIU_URL = /^https:\/\/([a-z0-9-]+\.)*fiu\.edu\//;

export type CheckResult = {
  /** The edit, trimmed and with empty rows dropped. Only meaningful when errors is empty. */
  edit: StopEdit;
  /** Problems that block saving, keyed by field. */
  errors: Record<string, string>;
  /** Advice that doesn't block saving (length targets, words text-to-speech reads badly). */
  warnings: string[];
};

const str = (v: unknown) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").trim() : "");
const strList = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);

/**
 * Cleans and checks an edit for `original`. Accepts anything (the server passes the request body straight in), keeps
 * only the editable fields, and reports what's wrong in words an editor can act on.
 */
export function checkEdit(original: Stop, raw: unknown): CheckResult {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const warnings: string[] = [];
  const tooLong = (field: string, value: string, max: number, what: string) => {
    if (value.length > max) errors[field] = `${what} is ${value.length} characters; keep it to ${max} or fewer.`;
  };

  const name = str(r.name);
  if (!name) errors.name = "The building needs a name.";
  tooLong("name", name, LIMITS.name, "The name");

  const label = str(r.label) || null;
  if (label) tooLong("label", label, LIMITS.label, "The map label");

  const status: StopStatus = r.status === "under-construction" ? "under-construction" : "open";
  if (r.status !== "open" && r.status !== "under-construction") errors.status = "Choose Open or Under construction.";
  const opens = status === "under-construction" ? str(r.opens) || null : null;
  if (opens) tooLong("opens", opens, LIMITS.opens, "The opening date");

  const summary = str(r.summary);
  if (!summary) errors.summary = "Write a one-sentence summary.";
  tooLong("summary", summary, LIMITS.summary, "The summary");

  const highlights = strList(r.highlights);
  if (highlights.length === 0) errors.highlights = "Add at least one highlight.";
  else if (highlights.length > LIMITS.maxHighlights) errors.highlights = `Keep it to ${LIMITS.maxHighlights} highlights.`;
  else if (highlights.some((h) => h.length > LIMITS.highlight))
    errors.highlights = `Each highlight should be ${LIMITS.highlight} characters or fewer.`;

  const impact = str(r.impact);
  if (!impact) errors.impact = "Say what support made possible here.";
  tooLong("impact", impact, LIMITS.impact, "Impact of support");

  let stat: StopEdit["stat"] = null;
  const rs = r.stat && typeof r.stat === "object" ? (r.stat as Record<string, unknown>) : null;
  if (rs) {
    const value = str(rs.value);
    const statLabel = str(rs.label);
    if (value || statLabel) {
      stat = { value, label: statLabel };
      if (!value || !statLabel) errors.stat = "A key stat needs both a number and what it counts, or leave both empty.";
      else if (value.length > LIMITS.statValue || statLabel.length > LIMITS.statLabel)
        errors.stat = `Keep the number to ${LIMITS.statValue} characters and its label to ${LIMITS.statLabel}.`;
    }
  }

  const narration = str(r.narration) || null;
  if (narration) tooLong("narration", narration, LIMITS.narration, "The narration");

  const sources = strList(r.sources);
  if (sources.length === 0) errors.sources = "Every card needs at least one source (a handbook page or an fiu.edu link).";
  else if (sources.length > LIMITS.maxSources) errors.sources = `Keep it to ${LIMITS.maxSources} sources.`;
  else if (sources.some((s) => s.length > LIMITS.source)) errors.sources = "One of the sources is too long.";

  // Tour guide tips are quoted word for word from the handbook (a test checks this), so Edit mode can keep or remove
  // them but not reword them or add new ones. Details are free text with a source.
  const originalTips = (original.guideNotes ?? []).filter((g) => g.kind === "tip");
  const guideNotes: GuideNote[] = [];
  const rawNotes = Array.isArray(r.guideNotes) ? r.guideNotes : [];
  for (const n of rawNotes) {
    const g = (n && typeof n === "object" ? n : {}) as Record<string, unknown>;
    const text = str(g.text);
    const source = str(g.source);
    if (!text && !source) continue;
    if (g.kind === "tip") {
      const kept = originalTips.find((t) => t.text === text && t.source === source);
      if (!kept) errors.guideNotes = "Tour guide tips are handbook quotes and can't be reworded here. Add a detail instead.";
      else guideNotes.push({ ...kept });
      continue;
    }
    if (!text) errors.guideNotes = "One of the ambassador details is empty.";
    else if (text.length > LIMITS.note) errors.guideNotes = `Keep each ambassador detail to ${LIMITS.note} characters.`;
    else if (!HANDBOOK_SOURCE.test(source) && !FIU_URL.test(source))
      errors.guideNotes = 'Each ambassador detail needs a source: "Handbook p.12" or an fiu.edu link starting with https://';
    guideNotes.push({ kind: "detail", text, source });
  }
  if (guideNotes.length > LIMITS.maxNotes) errors.guideNotes = `Keep it to ${LIMITS.maxNotes} ambassador notes.`;

  const reviewNotes = strList(r.reviewNotes);
  if (reviewNotes.length > LIMITS.maxNotes) errors.reviewNotes = `Keep it to ${LIMITS.maxNotes} notes.`;
  else if (reviewNotes.some((n) => n.length > LIMITS.note)) errors.reviewNotes = `Keep each note to ${LIMITS.note} characters.`;

  const edit: StopEdit = { name, label, status, opens, summary, highlights, impact, stat, narration, sources, guideNotes, reviewNotes };

  // Advice, matching npm run validate.
  const spoken = spokenWords(edit);
  if (original.type === "featured" && (spoken < 40 || spoken > 90))
    warnings.push(`What Tour Mode reads aloud is ${spoken} words. Featured stops aim for 40 to 90.`);
  if (original.type === "quick-pass" && narration && spoken > 35)
    warnings.push(`The narration is ${spoken} words. Quick-pass stops aim for 35 or fewer.`);
  if (narration && /[()]/.test(narration)) warnings.push("The narration has parentheses, which sound odd read aloud.");
  const caps = [...new Set(narration?.match(/\b[A-Z]{2,}\b/g) ?? [])].filter((w) => !SPOKEN_OK.has(w));
  if (caps.length) warnings.push(`The narration has ${caps.join(", ")}. Voices may spell these out letter by letter.`);

  return { edit, errors, warnings };
}

/** All-caps words that voices say correctly. Mirrors the validate script. */
const SPOKEN_OK = new Set(["FIU", "NCAA", "NBA", "LEED", "STAR", "MARC"]);

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Word count of what Tour Mode reads: the narration, or the card itself when there is none. */
export function spokenWords(edit: StopEdit): number {
  return words(edit.narration ?? [edit.summary, ...edit.highlights, edit.impact].join(" "));
}

/** The stop with the edit applied. Fields Edit mode can't change are kept from the original. */
export function applyEdit(original: Stop, edit: StopEdit, today: string): Stop {
  const next: Stop = {
    ...original,
    name: edit.name,
    status: edit.status,
    opens: edit.opens,
    summary: edit.summary,
    highlights: edit.highlights,
    impact: edit.impact,
    stat: edit.stat,
    narration: edit.narration,
    sources: edit.sources,
    lastReviewed: today,
  };
  // Optional fields are left out of the JSON when empty, as in the hand-written file.
  if (edit.label) next.label = edit.label;
  else delete next.label;
  if (edit.guideNotes.length) next.guideNotes = edit.guideNotes;
  else delete next.guideNotes;
  if (edit.reviewNotes.length) next.reviewNotes = edit.reviewNotes;
  else delete next.reviewNotes;
  return next;
}

/** Field names that differ between two stops, for the commit message. */
export function changedFields(before: Stop, after: Stop): string[] {
  const keys = ["name", "label", "status", "opens", "summary", "highlights", "impact", "stat", "narration", "sources", "guideNotes", "reviewNotes"] as const;
  return keys.filter((k) => JSON.stringify(before[k] ?? null) !== JSON.stringify(after[k] ?? null)).map(String);
}

/** content/stops.json as the repo formats it: two-space indent and a final newline. */
export function formatStops(stops: Stop[]): string {
  return JSON.stringify(stops, null, 2) + "\n";
}
