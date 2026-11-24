/**
 * How much room a stop card takes.
 * - normal: the usual card (a 384 px side panel, or a bottom sheet up to 55% of the screen).
 * - full: "expanded". Half the screen beside the map on wide screens; almost the whole screen on phones.
 * - peek: phones only. Just the title and Previous/Next, so the map is visible. Reached by swiping down.
 */
export type CardSize = "peek" | "normal" | "full";

export const CARD_SIZES: CardSize[] = ["peek", "normal", "full"];

/** The size the Expand button switches to. */
export const toggledSize = (size: CardSize): CardSize => (size === "full" ? "normal" : "full");

/** A swipe faster than this (px per ms) moves one size up or down, however far it went. */
export const FLICK_SPEED = 0.4;

/**
 * Where a dragged sheet settles when the finger lifts.
 * `heights` gives the sheet's height at each size, `height` its height when released, and `velocity` the
 * finger's speed in px per ms (negative is upward, which makes the sheet taller).
 */
export function snapSize(height: number, velocity: number, heights: Record<CardSize, number>): CardSize {
  const bySize = CARD_SIZES.map((size) => ({ size, h: heights[size] })).sort((a, b) => a.h - b.h);
  if (velocity <= -FLICK_SPEED) return (bySize.find((s) => s.h > height + 1) ?? bySize[bySize.length - 1]).size;
  if (velocity >= FLICK_SPEED) return ([...bySize].reverse().find((s) => s.h < height - 1) ?? bySize[0]).size;
  return bySize.reduce((best, s) => (Math.abs(s.h - height) < Math.abs(best.h - height) ? s : best)).size;
}
