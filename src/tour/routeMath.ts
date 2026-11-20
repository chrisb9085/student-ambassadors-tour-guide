import type { LngLat } from "../content/types";
import { metresBetween } from "../stops/describe";

/** A route line with cumulative distance (m) at each vertex, for moving a point along it. */
export type MeasuredRoute = { coords: LngLat[]; cumulative: number[]; length: number };

export function measureRoute(coords: LngLat[]): MeasuredRoute {
  const cumulative = [0];
  for (let i = 1; i < coords.length; i++) cumulative.push(cumulative[i - 1] + metresBetween(coords[i - 1], coords[i]));
  return { coords, cumulative, length: cumulative[cumulative.length - 1] };
}

/** The point `d` metres along the route (clamped to the ends). */
export function pointAt(route: MeasuredRoute, d: number): LngLat {
  const { coords, cumulative, length } = route;
  if (d <= 0) return coords[0];
  if (d >= length) return coords[coords.length - 1];
  // Binary search for the segment containing d.
  let lo = 0;
  let hi = cumulative.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid] <= d) lo = mid;
    else hi = mid;
  }
  const seg = cumulative[hi] - cumulative[lo];
  const t = seg === 0 ? 0 : (d - cumulative[lo]) / seg;
  const [x1, y1] = coords[lo];
  const [x2, y2] = coords[hi];
  return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
}

/**
 * For each point (in driving order), the route vertex it belongs to: the assignment that keeps vertices
 * in non-decreasing order and minimises the total distance. Stops near a road the route drives twice
 * (like the SW 14th St spur) then land on the correct pass.
 */
export function assignAlongRoute(route: MeasuredRoute, points: LngLat[]): number[] {
  const n = route.coords.length;
  const m = points.length;
  if (m === 0) return [];
  // best[i]: lowest total cost for points 0..j with point j at some vertex <= i; arg[i]: that vertex.
  const args: Int32Array[] = [];
  let prevBest = new Float64Array(n); // zeros: no earlier points
  for (let j = 0; j < m; j++) {
    const best = new Float64Array(n);
    const arg = new Int32Array(n);
    let runBest = Infinity;
    let runArg = 0;
    for (let i = 0; i < n; i++) {
      const total = prevBest[i] + metresBetween(points[j], route.coords[i]);
      if (total < runBest) {
        runBest = total;
        runArg = i;
      }
      best[i] = runBest;
      arg[i] = runArg;
    }
    args.push(arg);
    prevBest = best;
  }
  // Walk back from the last point: each earlier point is the best vertex at or before the next one's.
  const result = new Array<number>(m);
  let limit = n - 1;
  for (let j = m - 1; j >= 0; j--) {
    result[j] = args[j][limit];
    limit = result[j];
  }
  return result;
}
