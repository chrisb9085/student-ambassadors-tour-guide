/** Mirrors the stop schema documented in .claude/CLAUDE.md. */
export type StopType = "featured" | "quick-pass" | "also-on-campus";
export type StopStatus = "open" | "under-construction";
export type LngLat = [number, number];

export type Stop = {
  id: string;
  /** Route position (1-based). null for also-on-campus stops. */
  order: number | null;
  code: string;
  name: string;
  type: StopType;
  status: StopStatus;
  opens: string | null;
  coordinates: LngLat;
  summary: string;
  highlights: string[];
  impact: string;
  stat: { value: string; label: string } | null;
  narration: string | null;
  photo: string | null;
  sources: string[];
  lastReviewed: string;
  /** Facts that need Foundation confirmation. Never shown to guests. */
  reviewNotes?: string[];
};

/** Welcome and Closing cards. They sit at the PG1/PG2 loop, so they share its coordinates. */
export type TourCard = {
  id: "welcome" | "closing";
  title: string;
  coordinates: LngLat;
  summary: string;
  highlights: string[];
  impact: string;
  stat: { value: string; label: string } | null;
  narration: string | null;
  sources: string[];
  lastReviewed: string;
  reviewNotes?: string[];
};

export type Tour = { welcome: TourCard; closing: TourCard };

export type RouteFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: { type: "LineString"; coordinates: LngLat[] };
};

export type RouteCollection = { type: "FeatureCollection"; features: RouteFeature[] };

export type Bounds = [LngLat, LngLat];
