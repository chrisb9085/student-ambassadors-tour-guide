import { describe, expect, it } from "vitest";
import { allStops, routeStops } from "../content";
import { accessibleName, nearestStop, neighbours, shortLabel, statusBadge, typeLabel, zoomBand } from "./describe";
import type { Stop } from "../content/types";

const byId = (id: string) => allStops.find((s) => s.id === id)!;

describe("stop descriptions", () => {
  it("names route stops with their position, type and status for screen readers", () => {
    expect(accessibleName(byId("graham-center"), 32)).toBe("Stop 2 of 32: Graham Center. Featured.");
    expect(accessibleName(byId("bell-chapel"), 32)).toBe("Stop 3 of 32: Trish and Dan Bell Chapel. Quick pass. Under construction.");
    expect(accessibleName(byId("green-library"), 32)).toBe(
      "Steven and Dorothea Green Library, not on the driving route. Also on campus.",
    );
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
