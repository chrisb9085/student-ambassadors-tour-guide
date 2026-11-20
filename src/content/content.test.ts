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
