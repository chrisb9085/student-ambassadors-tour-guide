import { describe, expect, it } from "vitest";
import type { Map as MapboxMap } from "mapbox-gl";
import { defaultCamera } from "./camera";
import { INITIAL_VIEW } from "./campus";
import type { Bounds } from "../content/types";

const bounds: Bounds = [
  [-80.38, 25.752],
  [-80.369, 25.761],
];
const mapThatFits = (zoom: number) =>
  ({ cameraForBounds: () => ({ zoom, center: { lng: -80.3745, lat: 25.7565 } }) }) as unknown as MapboxMap;

describe("defaultCamera", () => {
  it("uses the standard campus view when the route already fits (iPad, desktop)", () => {
    expect(defaultCamera(mapThatFits(15.9), bounds)).toEqual(INITIAL_VIEW);
  });

  it("zooms out to fit the whole route on small screens (phones)", () => {
    expect(defaultCamera(mapThatFits(14.8), bounds)).toEqual({ ...INITIAL_VIEW, center: [-80.3745, 25.7565], zoom: 14.8 });
  });

  it("falls back to the standard view when the map can't compute a fit", () => {
    expect(defaultCamera({} as MapboxMap, bounds)).toEqual(INITIAL_VIEW);
  });
});
