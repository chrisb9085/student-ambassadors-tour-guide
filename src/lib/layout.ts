import { useSyncExternalStore } from "react";

/**
 * Landscape screens at least 640 px wide (desktop, iPad and phones turned sideways) dock cards and the stop
 * list as a side panel on the left. Portrait screens use a bottom sheet. Keep in sync with the same query in panels.css.
 */
export const SIDE_PANEL_QUERY = "(orientation: landscape) and (min-width: 640px)";

/** Panel width: 384 px, or 45% of the screen on phones in landscape. Keep in sync with --panel-w in theme.css. */
export function panelWidth(viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1024): number {
  return Math.min(384, Math.round(viewportWidth * 0.45));
}

/** Width of the side panel plus its 16 px margin, in px. */
export const sidePanelWidth = () => panelWidth() + 16;

function subscribe(onChange: () => void) {
  const mq = window.matchMedia?.(SIDE_PANEL_QUERY);
  mq?.addEventListener?.("change", onChange);
  return () => mq?.removeEventListener?.("change", onChange);
}

const getSnapshot = () => window.matchMedia?.(SIDE_PANEL_QUERY).matches ?? false;

export function useSidePanelLayout(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** Height of the Tour Mode control bar, in px. Keep in sync with --tour-bar-h in theme.css. */
export const TOUR_BAR_HEIGHT = 124;

/** Camera padding during Tour Mode, so the vehicle stays in the visible part of the map. */
export function tourPadding(sidePanel: boolean, height: number) {
  if (sidePanel) return { top: 80, bottom: TOUR_BAR_HEIGHT + 32, left: sidePanelWidth() + 16, right: 16 };
  // Portrait: the card covers up to 62% from the bottom (see TourControls.css).
  return { top: 72, bottom: Math.round(height * 0.62), left: 16, right: 16 };
}

/** Pixel offset that keeps a focused point visible beside the side panel or above the bottom sheet. */
export function focusOffset(sidePanel: boolean): [number, number] {
  if (sidePanel) return [sidePanelWidth() / 2, 0];
  const h = typeof window !== "undefined" ? window.innerHeight : 800;
  return [0, -Math.round(h * 0.25)];
}
