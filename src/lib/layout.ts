import { useSyncExternalStore } from "react";

/**
 * Wide landscape screens (iPad landscape, desktop) dock cards and the stop list as a side panel on the left.
 * Everything else (portrait iPad, phones) uses a bottom sheet. Keep in sync with the same query in panels.css.
 */
export const SIDE_PANEL_QUERY = "(orientation: landscape) and (min-width: 900px)";

/** Width of the side panel plus its margin, in px. Keep in sync with panels.css. */
export const SIDE_PANEL_WIDTH = 400;

function subscribe(onChange: () => void) {
  const mq = window.matchMedia?.(SIDE_PANEL_QUERY);
  mq?.addEventListener?.("change", onChange);
  return () => mq?.removeEventListener?.("change", onChange);
}

const getSnapshot = () => window.matchMedia?.(SIDE_PANEL_QUERY).matches ?? false;

export function useSidePanelLayout(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** Pixel offset that keeps a focused point visible beside the side panel or above the bottom sheet. */
export function focusOffset(sidePanel: boolean): [number, number] {
  if (sidePanel) return [SIDE_PANEL_WIDTH / 2, 0];
  const h = typeof window !== "undefined" ? window.innerHeight : 800;
  return [0, -Math.round(h * 0.25)];
}
