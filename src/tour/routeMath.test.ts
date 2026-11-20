import { describe, expect, it } from "vitest";
import { assignAlongRoute, measureRoute, pointAt } from "./routeMath";
import { buildSteps, narrationFor, progressLabel } from "./steps";
import { route, routeStops, tour } from "../content";
import { metresBetween } from "../stops/describe";
import type { LngLat } from "../content/types";

// A straight east-west line, out and back: 0 -> 0.002 -> 0 degrees longitude at the equator-ish latitude of campus.
const outAndBack: LngLat[] = [
  [-80.374, 25.755],
  [-80.373, 25.755],
  [-80.372, 25.755],
  [-80.373, 25.7551],
  [-80.374, 25.7551],
];

describe("route maths", () => {
  it("measures cumulative distance", () => {
    const m = measureRoute(outAndBack);
    expect(m.cumulative[0]).toBe(0);
    expect(m.cumulative[2]).toBeCloseTo(metresBetween(outAndBack[0], outAndBack[2]), 0);
    expect(m.length).toBeGreaterThan(m.cumulative[2]);
  });

  it("finds the point a given distance along, clamped to the ends", () => {
    const m = measureRoute(outAndBack);
    expect(pointAt(m, -5)).toEqual(outAndBack[0]);
    expect(pointAt(m, m.length + 5)).toEqual(outAndBack[4]);
    const mid = pointAt(m, m.cumulative[1] / 2);
    expect(mid[0]).toBeCloseTo(-80.3735, 6);
  });

  it("assigns points in order, so a point passed twice lands on the right pass", () => {
    const m = measureRoute(outAndBack);
    // The far end, then a point near the start that the route passes on the way out and again on the way back.
    const idx = assignAlongRoute(m, [outAndBack[2], [-80.37395, 25.75505]]);
    expect(idx[0]).toBe(2);
    expect(idx[1]).toBeGreaterThanOrEqual(2); // the return pass, not the outbound one
  });

  it("puts every real stop on the route in driving order, within 250 m", () => {
    const { steps } = buildSteps(tour, routeStops, route);
    const stopSteps = steps.filter((s) => s.kind === "stop");
    for (let i = 1; i < stopSteps.length; i++) {
      expect(stopSteps[i].distance, stopSteps[i].id).toBeGreaterThanOrEqual(stopSteps[i - 1].distance);
    }
    const m = measureRoute(route.geometry.coordinates);
    for (const s of stopSteps) expect(metresBetween(pointAt(m, s.distance), s.coordinates), s.id).toBeLessThan(250);
  });
});

describe("tour steps", () => {
  const { steps, measured } = buildSteps(tour, routeStops, route);

  it("runs Welcome, the 32 stops in order, then Closing", () => {
    expect(steps).toHaveLength(34);
    expect(steps[0]).toMatchObject({ kind: "welcome", distance: 0 });
    expect(steps[33]).toMatchObject({ kind: "closing", distance: measured.length });
    expect(steps.slice(1, 33).map((s) => s.stop!.order)).toEqual(Array.from({ length: 32 }, (_, i) => i + 1));
  });

  it("uses the narration script, or reads the card when there isn't one", () => {
    expect(steps[2].narration).toBe(routeStops[1].narration);
    expect(narrationFor({ narration: null, summary: "A place", highlights: ["Fact one", "Fact two!"], impact: "Gifts help" })).toBe(
      "A place. Fact one. Fact two! Gifts help.",
    );
  });

  it("labels progress", () => {
    expect(progressLabel(steps[0], 32)).toBe("Welcome");
    expect(progressLabel(steps[5], 32)).toBe("Stop 5 of 32");
    expect(progressLabel(steps[33], 32)).toBe("Thank you");
  });
});
