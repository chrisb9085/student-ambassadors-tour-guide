import type { Map as MapboxMap } from "mapbox-gl";
import type { Bounds } from "../content/types";
import { FIT_PADDING, INITIAL_VIEW } from "./campus";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

const duration = (ms: number) => (prefersReducedMotion() ? 0 : ms);

export function resetView(map: MapboxMap) {
  map.easeTo({ ...INITIAL_VIEW, duration: duration(900) });
}

export function showWholeRoute(map: MapboxMap, bounds: Bounds) {
  map.fitBounds(bounds, { padding: FIT_PADDING, bearing: 0, pitch: 0, duration: duration(900) });
}
