import type { LngLatBoundsLike } from "mapbox-gl";

/** Satellite imagery with road and building labels. */
export const MAP_STYLE = "mapbox://styles/mapbox/satellite-streets-v12";

/** The camera can't pan past this box, so guests stay on campus (SW corner, NE corner). */
export const CAMPUS_MAX_BOUNDS: LngLatBoundsLike = [
  [-80.392, 25.741],
  [-80.36, 25.77],
];

/** Opening view: the core of MMC with the start loop in frame. */
export const INITIAL_VIEW = {
  center: [-80.3752, 25.7565] as [number, number],
  zoom: 15.6,
  bearing: 0,
  pitch: 0,
};

export const MIN_ZOOM = 14.5;
export const MAX_ZOOM = 19;

/**
 * Fallback for "Show whole route" until content/route.geojson exists (Sprint 2 computes it from the route).
 * Covers the drive traced in docs/reference/aerial-route.png.
 */
export const DEFAULT_ROUTE_BOUNDS: [[number, number], [number, number]] = [
  [-80.3835, 25.75],
  [-80.3665, 25.762],
];

/** Screen padding so the route isn't hidden under the controls. */
export const FIT_PADDING = { top: 72, bottom: 72, left: 48, right: 96 };
