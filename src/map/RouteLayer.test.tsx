import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Map as MapboxMap } from "mapbox-gl";
import { RouteLayer } from "./RouteLayer";
import { ROUTE_LAYERS, ROUTE_SOURCE } from "./routeIds";
import { FakeMap } from "../test/mapboxMock";
import { route, tour } from "../content";
import { makeArrowImage, hexToRgb } from "./arrowImage";

const setup = () => {
  const map = new FakeMap({});
  const utils = render(<RouteLayer map={map as unknown as MapboxMap} route={route} start={tour.welcome.coordinates} />);
  return { map, ...utils };
};

describe("RouteLayer", () => {
  it("adds the route source, casing, line and arrow layers in drawing order", () => {
    const { map } = setup();
    expect(map.getSource(ROUTE_SOURCE)).toMatchObject({ type: "geojson", data: route });
    expect([...map.layers.keys()]).toEqual([...ROUTE_LAYERS]);
    expect(map.hasImage("tour-route-arrow")).toBe(true);
  });

  it("adds a labeled start/finish marker at the Welcome loop", () => {
    setup();
    const marker = document.querySelector(".start-marker")!;
    expect(marker).toHaveAttribute("role", "img");
    expect(marker.getAttribute("aria-label")).toMatch(/start and finish.*MARC/i);
  });

  it("removes its layers, source and marker on unmount", () => {
    const { map, unmount } = setup();
    unmount();
    expect(map.layers.size).toBe(0);
    expect(map.getSource(ROUTE_SOURCE)).toBeUndefined();
    expect(document.querySelector(".start-marker")).toBeNull();
  });

  it("doesn't throw when the map was removed first", () => {
    const { map, unmount } = setup();
    map.remove();
    expect(() => unmount()).not.toThrow();
  });
});

describe("arrow image", () => {
  it("is a square RGBA image with an opaque chevron and a transparent background", () => {
    const img = makeArrowImage(32, [8, 30, 63]);
    expect(img.data).toHaveLength(32 * 32 * 4);
    const alpha = (x: number, y: number) => img.data[(y * 32 + x) * 4 + 3];
    expect(alpha(0, 0)).toBe(0); // corner
    expect(alpha(22, 16)).toBe(255); // chevron tip (0.7, 0.5)
    expect(alpha(9, 6)).toBeGreaterThan(200); // upper stroke start (0.3, 0.2)
  });

  it("parses hex colors", () => {
    expect(hexToRgb("#081e3f")).toEqual([8, 30, 63]);
    expect(hexToRgb("fff")).toEqual([255, 255, 255]);
  });
});
