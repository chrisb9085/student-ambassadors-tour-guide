import type { Map as MapboxMap } from "mapbox-gl";
import type { Bounds, LngLat } from "../content/types";
import { FIT_PADDING, INITIAL_VIEW } from "./campus";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

const duration = (ms: number) => (prefersReducedMotion() ? 0 : ms);

/**
 * The opening view for this screen: the standard campus view, or, on screens too small for it to show the
 * whole route (phones), the zoom that fits the route. Bounds are passed in so this module stays content-free.
 */
export function defaultCamera(map: MapboxMap, routeBounds: Bounds) {
  const fit = map.cameraForBounds?.(routeBounds, { padding: FIT_PADDING });
  const zoom = fit?.zoom;
  if (typeof zoom === "number" && zoom < INITIAL_VIEW.zoom) {
    const c = fit!.center as { lng: number; lat: number } | [number, number];
    const center: [number, number] = Array.isArray(c) ? c : [c.lng, c.lat];
    return { ...INITIAL_VIEW, center, zoom };
  }
  return INITIAL_VIEW;
}

export function resetView(map: MapboxMap, routeBounds: Bounds) {
  map.easeTo({ ...defaultCamera(map, routeBounds), duration: duration(900) });
}

export function showWholeRoute(map: MapboxMap, bounds: Bounds) {
  map.fitBounds(bounds, { padding: FIT_PADDING, bearing: 0, pitch: 0, duration: duration(900) });
}

/** Zoom used when a stop's card opens: close enough to see the building. */
export const STOP_ZOOM = 16.8;

/** Centers a stop, shifted by `offset` px so it stays visible beside the card. Never zooms out. */
export function focusStop(map: MapboxMap, at: LngLat, offset: [number, number]) {
  map.easeTo({ center: at, zoom: Math.max(map.getZoom(), STOP_ZOOM), offset, duration: duration(800) });
}
