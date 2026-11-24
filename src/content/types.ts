/** Mirrors the stop schema documented in .claude/CLAUDE.md. */
export type StopType = "featured" | "quick-pass" | "also-on-campus";
export type StopStatus = "open" | "under-construction";
export type LngLat = [number, number];

/**
 * Study notes for ambassadors, shown under "For ambassadors" on the card (never read aloud).
 * "tip": a handbook Tour Guide Tip, quoted as written. "detail": a fuller fact for answering questions.
 */
export type GuideNote = {
  kind: "tip" | "detail";
  text: string;
  /** "Handbook p.N" or an official FIU URL. */
  source: string;
};

export type Stop = {
  id: string;
  /** Route position (1-based). null for also-on-campus stops. */
  order: number | null;
  code: string;
  name: string;
  /** Short name for the map label chip. Falls back to name. */
  label?: string;
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
  /** The building's official FIU web page (https, fiu.edu). The card's header button opens it in a new tab. */
  website?: string;
  sources: string[];
  lastReviewed: string;
  /** Facts that need Foundation confirmation. Never shown to guests. */
  reviewNotes?: string[];
  guideNotes?: GuideNote[];
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
