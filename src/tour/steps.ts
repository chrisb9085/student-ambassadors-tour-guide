import type { LngLat, RouteFeature, Stop, Tour, TourCard } from "../content/types";
import { assignAlongRoute, measureRoute, type MeasuredRoute } from "./routeMath";

/** One step of the guided tour: the Welcome card, a route stop, or the Closing card. */
export type TourStep = {
  kind: "welcome" | "stop" | "closing";
  /** Stop id for route stops; "welcome" or "closing" otherwise. */
  id: string;
  stop: Stop | null;
  card: TourCard | null;
  title: string;
  /** What gets spoken and shown as captions. */
  narration: string;
  coordinates: LngLat;
  /** Metres along the route where the vehicle stops for this step. */
  distance: number;
};

/** "Welcome", "Stop 5 of 32" or "Thank you". */
export function progressLabel(step: TourStep, total: number): string {
  if (step.kind === "welcome") return "Welcome";
  if (step.kind === "closing") return "Thank you";
  return `Stop ${step.stop!.order} of ${total}`;
}

/** Spoken text: the narration script if there is one, otherwise the card read top to bottom. */
export function narrationFor(item: { narration: string | null; summary: string; highlights: string[]; impact: string }): string {
  if (item.narration) return item.narration;
  // Highlights are fragments: end each with a period unless it already has closing punctuation.
  const sentences = [item.summary, ...item.highlights, item.impact].map((s) => s.trim()).map((s) => (/[.!?]$/.test(s) ? s : `${s}.`));
  return sentences.join(" ");
}

export function buildSteps(tour: Tour, routeStops: Stop[], route: RouteFeature): { steps: TourStep[]; measured: MeasuredRoute } {
  const measured = measureRoute(route.geometry.coordinates);
  const vertices = assignAlongRoute(measured, routeStops.map((s) => s.coordinates));
  const steps: TourStep[] = [
    {
      kind: "welcome",
      id: "welcome",
      stop: null,
      card: tour.welcome,
      title: tour.welcome.title,
      narration: narrationFor(tour.welcome),
      coordinates: tour.welcome.coordinates,
      distance: 0,
    },
    ...routeStops.map((stop, i) => ({
      kind: "stop" as const,
      id: stop.id,
      stop,
      card: null,
      title: stop.name,
      narration: narrationFor(stop),
      coordinates: stop.coordinates,
      distance: measured.cumulative[vertices[i]],
    })),
    {
      kind: "closing",
      id: "closing",
      stop: null,
      card: tour.closing,
      title: tour.closing.title,
      narration: narrationFor(tour.closing),
      coordinates: tour.closing.coordinates,
      distance: measured.length,
    },
  ];
  return { steps, measured };
}
