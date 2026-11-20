import stopsJson from "../../content/stops.json";
import tourJson from "../../content/tour.json";
import routeRaw from "../../content/route.geojson?raw";
import type { Bounds, LngLat, RouteCollection, RouteFeature, Stop, Tour } from "./types";

export const allStops = stopsJson as Stop[];

/** Stops on the driving route, in driving order. */
export const routeStops: Stop[] = allStops
  .filter((s) => s.order !== null)
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

/** Clickable stops that aren't part of the drive (Green Library in the MVP). */
export const alsoOnCampus: Stop[] = allStops.filter((s) => s.type === "also-on-campus");

export const tour = tourJson as Tour;

export const route: RouteFeature = (JSON.parse(routeRaw) as RouteCollection).features[0];

export function boundsOf(points: LngLat[]): Bounds {
  let [minX, minY] = points[0];
  let [maxX, maxY] = points[0];
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return [
    [minX, minY],
    [maxX, maxY],
  ];
}

/** Everything a guest should see with "Whole route": the line, every stop and Green Library. */
export const routeBounds: Bounds = boundsOf([...route.geometry.coordinates, ...allStops.map((s) => s.coordinates)]);
