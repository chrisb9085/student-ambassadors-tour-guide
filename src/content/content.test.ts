import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { allStops, alsoOnCampus, boundsOf, route, routeBounds, routeStops, tour } from ".";
import type { LngLat } from "./types";

const metres = (a: LngLat, b: LngLat) => {
  const dx = (b[0] - a[0]) * Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180);
  return Math.hypot(dx, b[1] - a[1]) * 111_320;
};
const distanceToRoute = (p: LngLat) => Math.min(...route.geometry.coordinates.map((c) => metres(p, c)));

describe("tour content (SCOPE section 5)", () => {
  it("has the 32 route stops in driving order, numbered 1 to 32", () => {
    expect(routeStops).toHaveLength(32);
    expect(routeStops.map((s) => s.order)).toEqual(Array.from({ length: 32 }, (_, i) => i + 1));
  });

  it("starts with SASC and Graham Center and ends with Frost and WPAC", () => {
    expect(routeStops.slice(0, 2).map((s) => s.code)).toEqual(["SASC", "GC"]);
    expect(routeStops.slice(-2).map((s) => s.code)).toEqual(["FROST", "WPAC"]);
  });

  it("includes Green Library as the only also-on-campus stop", () => {
    expect(alsoOnCampus.map((s) => s.id)).toEqual(["green-library"]);
    expect(alsoOnCampus[0].order).toBeNull();
  });

  it("marks Bell Chapel as an under-construction quick pass, still with a full card", () => {
    const bell = allStops.find((s) => s.id === "bell-chapel")!;
    expect(bell).toMatchObject({ status: "under-construction", type: "quick-pass", order: 3 });
    expect(bell.summary.length).toBeGreaterThan(0);
    expect(bell.highlights.length).toBeGreaterThan(0);
  });

  it("gives every stop a unique id, a source and campus coordinates", () => {
    expect(new Set(allStops.map((s) => s.id)).size).toBe(allStops.length);
    for (const s of allStops) {
      expect(s.sources.length, s.id).toBeGreaterThan(0);
      const [lng, lat] = s.coordinates;
      expect(lng, s.id).toBeGreaterThan(-80.386);
      expect(lng, s.id).toBeLessThan(-80.366);
      expect(lat, s.id).toBeGreaterThan(25.745);
      expect(lat, s.id).toBeLessThan(25.766);
    }
  });

  it("places every route stop within sight of the route (250 m)", () => {
    for (const s of routeStops) expect(distanceToRoute(s.coordinates), s.id).toBeLessThan(250);
  });

  it("starts and ends the route at the Welcome loop", () => {
    const line = route.geometry.coordinates;
    expect(metres(line[0], tour.welcome.coordinates)).toBeLessThan(30);
    expect(metres(line[line.length - 1], tour.closing.coordinates)).toBeLessThan(30);
  });

  it("has Welcome and Closing cards", () => {
    expect(tour.welcome.title).toBeTruthy();
    expect(tour.closing.title).toBeTruthy();
  });

  it("never shows review notes text in guest-facing fields", () => {
    for (const s of allStops) {
      const guestText = [s.summary, s.impact, s.narration ?? "", ...s.highlights].join(" ");
      expect(guestText, s.id).not.toMatch(/confirm|TODO|TBD|needs content/i);
    }
  });
});

describe("decisions from Chris, 2026-11-20 (docs/BACKLOG.md)", () => {
  const byId = (id: string) => allStops.find((s) => s.id === id)!;

  it("uses full official names, with Academic Health Center N: for the AHC buildings", () => {
    const ahc = routeStops.filter((s) => s.name.startsWith("Academic Health Center"));
    // Sorted: the route passes AHC 5 (stop 7) before AHC 4 (stop 10).
    expect(ahc.map((s) => s.name).sort()).toEqual([
      "Academic Health Center 1: Center for Children and Families",
      "Academic Health Center 2: Herbert Wertheim College of Medicine",
      "Academic Health Center 3: Nicole Wertheim College of Nursing and Health Sciences",
      "Academic Health Center 4: Science Classroom Complex",
      "Academic Health Center 5: Robert Stempel College of Public Health and Social Work",
    ]);
    // Full names are spoken too, so the narration matches the card.
    for (const s of ahc) expect(s.narration, s.id).toContain(s.name.split(":")[0]);
    expect(byId("graham-center").name).toBe("Ernest R. Graham Center");
    // Map chips keep the short labels.
    expect(ahc.every((s) => s.label && !s.label.startsWith("Academic Health Center"))).toBe(true);
  });

  it("matches the featured and quick-pass changes in SCOPE section 5", () => {
    for (const order of [9, 10, 13, 15, 22]) expect(routeStops[order - 1].type, `stop ${order}`).toBe("featured");
    expect(routeStops[31].type).toBe("quick-pass");
  });

  it("drives past Lot 9, not through it: stop 18 is the College of Business Complex", () => {
    const cbc = routeStops[17];
    expect(cbc.name).toBe("College of Business Complex");
    expect(JSON.stringify(allStops)).not.toMatch(/Lot 9/);
  });

  it("applies the review answers (Parkview 620, Innovation 1 125,000 sq ft, Steven Green)", () => {
    expect(byId("parkview-hall").highlights).toContain("620 residents");
    expect(byId("innovation-1").stat).toEqual({ value: "125,000", label: "square feet" });
    expect(byId("green-library").name).toBe("Steven and Dorothea Green Library");
  });

  it("keeps Bell Chapel under construction and records Chris's answer for the Foundation", () => {
    const bell = byId("bell-chapel");
    expect(bell.status).toBe("under-construction");
    expect(bell.reviewNotes?.join(" ")).toMatch(/opened in 2023/);
  });
});

describe("Foundation review page (S5.2)", () => {
  it("docs/CONTENT-REVIEW.md matches content/ (run npm run content:review after edits)", () => {
    expect(() => execFileSync("node", ["tools/content-review.mjs", "--check"], { stdio: "pipe" })).not.toThrow();
  });
});

describe("narration is written for the ear", () => {
  const SPOKEN_OK = new Set(["FIU", "NCAA", "NBA", "LEED", "STAR", "MARC"]);
  for (const item of [...allStops, tour.welcome, tour.closing]) {
    it(`${item.id}: no parentheses or building codes`, () => {
      const n = item.narration ?? "";
      expect(n).not.toMatch(/[()]/);
      const codes = (n.match(/\b[A-Z]{2,}\b/g) ?? []).filter((w) => !SPOKEN_OK.has(w));
      expect(codes).toEqual([]);
    });
  }
});

describe("boundsOf", () => {
  it("returns the south-west and north-east corners", () => {
    expect(
      boundsOf([
        [-80.37, 25.75],
        [-80.38, 25.76],
        [-80.375, 25.755],
      ]),
    ).toEqual([
      [-80.38, 25.75],
      [-80.37, 25.76],
    ]);
  });

  it("route bounds cover every stop", () => {
    const [[w, s], [e, n]] = routeBounds;
    for (const { coordinates: [x, y] } of allStops) {
      expect(x >= w && x <= e && y >= s && y <= n).toBe(true);
    }
  });
});
