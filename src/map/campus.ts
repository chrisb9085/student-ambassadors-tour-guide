/** Satellite imagery with road and building labels. */
export const MAP_STYLE = "mapbox://styles/mapbox/satellite-streets-v12";

/**
 * The map center can't leave this box (Mapbox clamps the center, not the screen edge), so guests stay on campus.
 * It is the campus plus about 300 m on each side. SW corner, NE corner.
 */
export const CAMPUS_MAX_BOUNDS: [[number, number], [number, number]] = [
  [-80.388, 25.744],
  [-80.364, 25.767],
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

/** Screen padding so the route isn't hidden under the controls. */
export const FIT_PADDING = { top: 72, bottom: 72, left: 48, right: 96 };
