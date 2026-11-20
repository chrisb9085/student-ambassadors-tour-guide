import { describe, expect, it } from "vitest";
import { allStops, routeStops } from "../content";
import { markerDescription, markerName, nearestStop, neighbours, shortLabel, statusBadge, typeLabel, zoomBand } from "./describe";
import type { Stop } from "../content/types";

const byId = (id: string) => allStops.find((s) => s.id === id)!;

describe("stop descriptions", () => {
  it("names markers starting with their visible text (WCAG 2.5.3), then their position", () => {
    expect(markerName(byId("graham-center"), 32)).toBe("2 Graham Center, stop 2 of 32");
    expect(markerName(byId("bell-chapel"), 32)).toBe("3 Bell Chapel, stop 3 of 32");
    expect(markerName(byId("green-library"), 32)).toBe("Green Library, not on the driving route");
  });

  it("describes markers with the full name, type and status", () => {
    expect(markerDescription(byId("student-academic-success-center"))).toBe("Student Academic Success Center. Featured.");
    expect(markerDescription(byId("bell-chapel"))).toBe("Trish and Dan Bell Chapel. Quick pass. Under construction.");
    expect(markerDescription(byId("green-library"))).toBe("Steven and Dorothea Green Library. Also on campus.");
  });

  it("shows an opening year on the construction badge when known", () => {
    const bell = byId("bell-chapel");
    expect(statusBadge(bell)).toBe("Under construction");
    expect(statusBadge({ ...bell, opens: "2028" })).toBe("Under construction · Opens 2028");
    expect(statusBadge(byId("graham-center"))).toBeNull();
  });

  it("uses the short label when there is one", () => {
    expect(shortLabel(byId("steven-j-green-school"))).toBe("Green School (SIPA)");
    expect(shortLabel({ ...byId("graham-center"), label: undefined } as Stop)).toBe("Graham Center");
  });

  it("labels stop types", () => {
    expect(typeLabel(byId("graham-center"))).toBe("Featured");
    expect(typeLabel(byId("red-garage"))).toBe("Quick pass");
    expect(typeLabel(byId("green-library"))).toBe("Also on campus");
  });

  it("finds previous and next stops along the route", () => {
    expect(neighbours(routeStops, "student-academic-success-center")).toEqual({ prev: null, next: byId("graham-center") });
    expect(neighbours(routeStops, "wertheim-performing-arts-center").next).toBeNull();
    expect(neighbours(routeStops, "green-library")).toEqual({ prev: null, next: null });
  });

  it("matches a tap to the nearest stop within 70 m, and nothing farther", () => {
    const gc = byId("graham-center");
    expect(nearestStop(allStops, [gc.coordinates[0] + 0.0002, gc.coordinates[1]])?.id).toBe("graham-center");
    expect(nearestStop(allStops, [-80.383, 25.749])).toBeNull();
  });

  it("bands zoom levels for labels", () => {
    expect(zoomBand(15.6)).toBe("low");
    expect(zoomBand(16.5)).toBe("mid");
    expect(zoomBand(17.5)).toBe("high");
  });
});
