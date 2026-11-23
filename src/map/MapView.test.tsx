import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MapView } from "./MapView";
import { FakeAttributionControl, FakeMap } from "../test/mapboxMock";
import { CAMPUS_MAX_BOUNDS, MAP_STYLE, MIN_ZOOM } from "./campus";

describe("MapView", () => {
  it("creates a satellite map locked to campus, north-up and flat", () => {
    render(<MapView token="pk.fake-test-value" />);
    const map = FakeMap.last;
    expect(map.options).toMatchObject({
      accessToken: "pk.fake-test-value",
      style: MAP_STYLE,
      maxBounds: CAMPUS_MAX_BOUNDS,
      minZoom: MIN_ZOOM,
      dragRotate: false,
      touchPitch: false,
      respectPrefersReducedMotion: true,
    });
    expect(map.touchZoomRotate.disableRotation).toHaveBeenCalled();
    expect(map.keyboard.disableRotation).toHaveBeenCalled();
  });

  it("puts the Mapbox logo and attribution top-right, where panels never cover them", () => {
    render(<MapView token="pk.fake-test-value" />);
    const map = FakeMap.last;
    expect(map.options).toMatchObject({ logoPosition: "top-right", attributionControl: false });
    expect(map.addControl).toHaveBeenCalledWith(expect.any(FakeAttributionControl), "top-right");
  });

  it("labels the map region for screen readers", () => {
    render(<MapView token="pk.fake-test-value" />);
    expect(screen.getByRole("region", { name: /satellite map of fiu/i })).toBeInTheDocument();
  });

  it("reports the map once it loads, and null when unmounted", () => {
    const onReady = vi.fn();
    const { unmount } = render(<MapView token="pk.fake-test-value" onMapReady={onReady} />);
    expect(onReady).not.toHaveBeenCalled();
    act(() => FakeMap.last.emit("load"));
    expect(onReady).toHaveBeenLastCalledWith(FakeMap.last);
    unmount();
    expect(onReady).toHaveBeenLastCalledWith(null);
    expect(FakeMap.last.removed).toBe(true);
  });

  it("shows a message when Mapbox rejects the token", () => {
    render(<MapView token="pk.fake-test-value" />);
    act(() => FakeMap.last.emit("error", { error: { status: 401 } }));
    expect(screen.getByRole("alert")).toHaveTextContent(/token is invalid or not allowed/i);
  });

  it("ignores non-auth errors such as a missing tile", () => {
    render(<MapView token="pk.fake-test-value" />);
    act(() => FakeMap.last.emit("error", { error: { status: 404 } }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
