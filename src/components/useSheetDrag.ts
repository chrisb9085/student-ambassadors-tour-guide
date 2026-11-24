import { useRef, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { snapSize, toggledSize, type CardSize } from "./cardSize";

/** Movement (px) before a press counts as a drag rather than a tap. */
const DRAG_THRESHOLD = 6;

type Drag = {
  id: number;
  startY: number;
  startHeight: number;
  heights: Record<CardSize, number>;
  dragging: boolean;
  /** Recent finger positions, for the release speed. */
  trail: { y: number; t: number }[];
};

/**
 * Phones: drag the card's grab handle or header up or down to resize it, snapping to peek, normal or full.
 * A tap on the handle toggles between normal and full. Off when `enabled` is false (side-panel layout).
 */
export function useSheetDrag(
  panelRef: RefObject<HTMLElement | null>,
  size: CardSize,
  onSizeChange: ((size: CardSize) => void) | undefined,
  enabled: boolean,
) {
  const drag = useRef<Drag | null>(null);

  const measure = (panel: HTMLElement): Record<CardSize, number> => {
    const area = panel.parentElement?.clientHeight ?? window.innerHeight;
    const style = getComputedStyle(panel);
    // Peek shows the handle, header and footer; everything else is hidden.
    let peek = parseFloat(style.paddingBottom) || 0;
    for (const child of Array.from(panel.children) as HTMLElement[]) {
      if (child.matches(".sheet-handle, .info-card-header, .info-card-footer")) peek += child.offsetHeight;
    }
    const current = panel.getBoundingClientRect().height;
    return {
      peek: Math.min(peek, area * 0.4),
      normal: size === "normal" ? current : Math.round(area * 0.55),
      full: area - 12,
    };
  };

  const end = (e: ReactPointerEvent<HTMLElement>, cancelled: boolean) => {
    const d = drag.current;
    const panel = panelRef.current;
    if (!d || d.id !== e.pointerId || !panel) return;
    drag.current = null;
    const height = panel.getBoundingClientRect().height;
    panel.style.removeProperty("height");
    panel.style.removeProperty("max-height");
    delete panel.dataset.dragging;
    if (cancelled || !d.dragging) {
      // A tap on the handle (not the header, which holds the title) toggles the size.
      if (!cancelled && (e.target as HTMLElement).closest(".sheet-handle")) onSizeChange?.(size === "peek" ? "normal" : toggledSize(size));
      return;
    }
    const first = d.trail[0];
    const last = d.trail[d.trail.length - 1];
    // Moves within the same millisecond count as one millisecond apart.
    const velocity = first && last && last !== first ? (last.y - first.y) / Math.max(1, last.t - first.t) : 0;
    const next = snapSize(height, velocity, d.heights);
    if (next !== size) onSizeChange?.(next);
  };

  return {
    onPointerDown(e: ReactPointerEvent<HTMLElement>) {
      const panel = panelRef.current;
      if (!enabled || !onSizeChange || !panel || !e.isPrimary || e.button !== 0) return;
      // Buttons in the header keep working as buttons.
      if ((e.target as HTMLElement).closest("button, a, input, select, textarea")) return;
      // Keep receiving moves when the finger leaves the handle, as it does at once on a quick swipe.
      e.currentTarget.setPointerCapture?.(e.pointerId);
      drag.current = {
        id: e.pointerId,
        startY: e.clientY,
        startHeight: panel.getBoundingClientRect().height,
        heights: measure(panel),
        dragging: false,
        trail: [{ y: e.clientY, t: e.timeStamp }],
      };
    },
    onPointerMove(e: ReactPointerEvent<HTMLElement>) {
      const d = drag.current;
      const panel = panelRef.current;
      if (!d || d.id !== e.pointerId || !panel) return;
      const dy = e.clientY - d.startY;
      if (!d.dragging) {
        if (Math.abs(dy) < DRAG_THRESHOLD) return;
        d.dragging = true;
        panel.dataset.dragging = "true";
      }
      const h = Math.max(d.heights.peek, Math.min(d.heights.full, d.startHeight - dy));
      panel.style.maxHeight = "none";
      panel.style.height = `${h}px`;
      d.trail.push({ y: e.clientY, t: e.timeStamp });
      // Speed over the last ~100 ms only.
      while (d.trail.length > 2 && e.timeStamp - d.trail[0].t > 100) d.trail.shift();
    },
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => end(e, false),
    onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => end(e, true),
  };
}
