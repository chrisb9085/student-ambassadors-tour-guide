import type { LngLat, Stop } from "../content/types";

export const shortLabel = (s: Stop) => s.label ?? s.name;

/**
 * Accessible name for a button that shows the short label (Previous and Next on the card). It starts with
 * the visible text so voice control ("click Stempel Public Health") works (WCAG 2.5.3, Label in Name), and
 * includes the full name when the label isn't already part of it.
 */
export function buttonName(stop: Stop): string {
  const label = shortLabel(stop);
  return stop.name.toLowerCase().includes(label.toLowerCase()) ? stop.name : `${label}, ${stop.name}`;
}

/** Zoom bands that decide which marker labels show (see StopMarkers.css). */
export function zoomBand(zoom: number): "low" | "mid" | "high" {
  if (zoom < 16.3) return "low";
  if (zoom < 17) return "mid";
  return "high";
}

/** Badge text for a stop's status, or null when there's nothing to flag. */
export function statusBadge(s: Stop): string | null {
  if (s.status !== "under-construction") return null;
  return s.opens ? `Under construction · Opens ${s.opens}` : "Under construction";
}

export function typeLabel(s: Stop): string {
  if (s.type === "also-on-campus") return "Also on campus";
  if (s.type === "quick-pass") return "Quick pass";
  return "Featured";
}

/**
 * Accessible name for a map marker. It starts with exactly what the marker shows ("3 Bell Chapel"), so
 * voice-control users can say what they see (WCAG 2.5.3, Label in Name), then gives the position.
 */
export function markerName(s: Stop, total: number): string {
  const visible = s.order !== null ? `${s.order} ${shortLabel(s)}` : shortLabel(s);
  return s.order !== null ? `${visible}, stop ${s.order} of ${total}` : `${visible}, not on the driving route`;
}

/** Accessible description for a marker: full name, type and status, e.g. "Trish and Dan Bell Chapel. Quick pass. Under construction." */
export function markerDescription(s: Stop): string {
  const parts = [s.name, typeLabel(s)];
  const badge = statusBadge(s);
  if (badge) parts.push(badge);
  return parts.join(". ") + ".";
}

/** Previous and next stops in driving order. Off-route stops have neither. */
export function neighbours(stops: Stop[], id: string): { prev: Stop | null; next: Stop | null } {
  const i = stops.findIndex((s) => s.id === id);
  if (i < 0) return { prev: null, next: null };
  return { prev: stops[i - 1] ?? null, next: stops[i + 1] ?? null };
}

export function metresBetween(a: LngLat, b: LngLat): number {
  const dx = (b[0] - a[0]) * Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180);
  return Math.hypot(dx, b[1] - a[1]) * 111_320;
}

/** The closest stop to a tapped point, if one is within maxMetres (a tap on or next to the building). */
export function nearestStop(stops: Stop[], p: LngLat, maxMetres = 70): Stop | null {
  let best: Stop | null = null;
  let bestD = maxMetres;
  for (const s of stops) {
    const d = metresBetween(s.coordinates, p);
    if (d <= bestD) {
      best = s;
      bestD = d;
    }
  }
  return best;
}
