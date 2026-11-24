import { describe, expect, it } from "vitest";
import { allStops } from "../content";
import { applyEdit, changedFields, checkEdit, editableFrom, formatStops } from "./editable";
import { readFileSync } from "node:fs";

const featured = allStops.find((s) => s.type === "featured" && s.guideNotes?.some((g) => g.kind === "tip"))!;
const quick = allStops.find((s) => s.type === "quick-pass")!;

describe("Edit mode rules", () => {
  it("accepts every stop as it is today", () => {
    for (const s of allStops) expect(checkEdit(s, editableFrom(s)).errors, s.id).toEqual({});
  });

  it("round-trips every stop unchanged, so saving without edits changes nothing", () => {
    for (const s of allStops) expect(applyEdit(s, checkEdit(s, editableFrom(s)).edit, s.lastReviewed), s.id).toEqual(s);
    expect(formatStops(allStops)).toBe(readFileSync("content/stops.json", "utf8").replace(/\r\n/g, "\n"));
  });

  it("requires a name, summary, impact, a highlight and a source", () => {
    const { errors } = checkEdit(featured, { ...editableFrom(featured), name: " ", summary: "", impact: "", highlights: ["  "], sources: [] });
    expect(Object.keys(errors).sort()).toEqual(["highlights", "impact", "name", "sources", "summary"]);
  });

  it("caps highlights at four and trims empty rows", () => {
    expect(checkEdit(featured, { ...editableFrom(featured), highlights: ["a", "b", "c", "d", "e"] }).errors.highlights).toMatch(/4/);
    expect(checkEdit(featured, { ...editableFrom(featured), highlights: [" a ", "", "b"] }).edit.highlights).toEqual(["a", "b"]);
  });

  it("needs both halves of a key stat, or neither", () => {
    expect(checkEdit(featured, { ...editableFrom(featured), stat: { value: "10", label: "" } }).errors.stat).toBeTruthy();
    const none = checkEdit(featured, { ...editableFrom(featured), stat: { value: " ", label: "" } });
    expect(none.errors.stat).toBeUndefined();
    expect(none.edit.stat).toBeNull();
  });

  it("drops the opening date when a building is marked open", () => {
    expect(checkEdit(featured, { ...editableFrom(featured), status: "open", opens: "2028" }).edit.opens).toBeNull();
    expect(checkEdit(featured, { ...editableFrom(featured), status: "under-construction", opens: "2028" }).edit.opens).toBe("2028");
  });

  it("keeps handbook tips word for word: they can be removed but not reworded or invented", () => {
    const e = editableFrom(featured);
    const tip = e.guideNotes.find((g) => g.kind === "tip")!;
    const reworded = e.guideNotes.map((g) => (g === tip ? { ...g, text: g.text + " Extra." } : g));
    expect(checkEdit(featured, { ...e, guideNotes: reworded }).errors.guideNotes).toMatch(/can't be reworded/);
    expect(checkEdit(featured, { ...e, guideNotes: e.guideNotes.filter((g) => g !== tip) }).errors).toEqual({});
  });

  it("takes an optional official page, which must be an https fiu.edu address", () => {
    const e = editableFrom(quick);
    expect(checkEdit(quick, { ...e, website: "https://example.com/" }).errors.website).toMatch(/fiu\.edu/);
    expect(checkEdit(quick, { ...e, website: "http://law.fiu.edu/about/" }).errors.website).toBeTruthy();
    const ok = checkEdit(quick, { ...e, website: " https://law.fiu.edu/about/ " });
    expect(ok.errors).toEqual({});
    const saved = applyEdit(quick, ok.edit, "2026-11-24");
    expect(saved.website).toBe("https://law.fiu.edu/about/");
    expect(changedFields({ ...quick, website: undefined }, saved)).toContain("website");
    expect("website" in applyEdit(saved, { ...ok.edit, website: null }, "2026-11-24")).toBe(false);
  });

  it("needs a handbook page or fiu.edu link for each detail", () => {
    const e = editableFrom(quick);
    const bad = checkEdit(quick, { ...e, guideNotes: [...e.guideNotes, { kind: "detail", text: "A fact", source: "wikipedia" }] });
    expect(bad.errors.guideNotes).toMatch(/source/);
    const good = checkEdit(quick, { ...e, guideNotes: [...e.guideNotes, { kind: "detail", text: "A fact", source: "https://www.fiu.edu/about/" }] });
    expect(good.errors).toEqual({});
  });

  it("warns, without blocking, about narration length and words voices read badly", () => {
    const r = checkEdit(featured, { ...editableFrom(featured), narration: "Short (too short) for the SIPA building." });
    expect(r.errors).toEqual({});
    expect(r.warnings.join(" ")).toMatch(/40 to 90/);
    expect(r.warnings.join(" ")).toMatch(/parentheses/);
    expect(r.warnings.join(" ")).toMatch(/SIPA/);
  });

  it("ignores fields Edit mode doesn't own, and stamps the review date", () => {
    const r = checkEdit(featured, { ...editableFrom(featured), id: "x", order: 9, coordinates: [0, 0], summary: "New." });
    const next = applyEdit(featured, r.edit, "2026-12-01");
    expect(next).toMatchObject({ id: featured.id, order: featured.order, coordinates: featured.coordinates, summary: "New.", lastReviewed: "2026-12-01" });
    expect(changedFields(featured, next)).toEqual(["summary"]);
  });
});
