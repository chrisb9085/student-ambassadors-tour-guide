import { useState } from "react";
import type { Stop } from "../content/types";
import { InfoCard, type CardTab } from "../components/InfoCard";
import { narrationFor } from "../tour/steps";
import { buttonName, shortLabel, statusBadge, typeLabel } from "./describe";

type Props = {
  stop: Stop;
  total: number;
  prev: Stop | null;
  next: Stop | null;
  onSelect: (id: string) => void;
  onClose: () => void;
};

/** The card for one stop, with Previous and Next along the route. */
export function StopCard({ stop, total, prev, next, onSelect, onClose }: Props) {
  const onRoute = stop.order !== null;
  const [tab, setTab] = useCardTab();
  const kicker = onRoute ? `Stop ${stop.order} of ${total} · ${typeLabel(stop)}` : "Also on campus · Not on the driving route";

  return (
    <InfoCard
      contentKey={stop.id}
      kicker={kicker}
      title={stop.name}
      badge={statusBadge(stop)}
      summary={stop.summary}
      stat={stop.stat}
      highlights={stop.highlights}
      impact={stop.impact}
      guideNotes={stop.guideNotes}
      script={{ text: narrationFor(stop) }}
      tab={tab}
      onTabChange={setTab}
      onClose={onClose}
      closeLabel={`Close ${stop.name}`}
      headerActions={<WebsiteLink stop={stop} />}
      footer={
        onRoute ? (
          <>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!prev}
              onClick={() => prev && onSelect(prev.id)}
              aria-label={prev ? `Previous stop: ${buttonName(prev)}` : "Previous stop"}
            >
              <span aria-hidden="true">‹</span>
              <span className="btn-label-truncate">{prev ? shortLabel(prev) : "Previous"}</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!next}
              onClick={() => next && onSelect(next.id)}
              aria-label={next ? `Next stop: ${buttonName(next)}` : "Next stop"}
            >
              <span className="btn-label-truncate">{next ? shortLabel(next) : "Next"}</span>
              <span aria-hidden="true">›</span>
            </button>
          </>
        ) : undefined
      }
    />
  );
}

const TAB_KEY = "fiu-tour.card-tab";

/**
 * The open tab (Info or Script). It stays put as you move between stops, and is remembered on this device,
 * so someone memorising scripts can go stop to stop on the Script tab. Storage can be unavailable (private
 * browsing), so every read and write is guarded.
 */
function useCardTab(): [CardTab, (tab: CardTab) => void] {
  const [tab, setTab] = useState<CardTab>(() => {
    try {
      return window.localStorage.getItem(TAB_KEY) === "script" ? "script" : "info";
    } catch {
      return "info";
    }
  });
  const choose = (next: CardTab) => {
    setTab(next);
    try {
      window.localStorage.setItem(TAB_KEY, next);
    } catch {
      // Not saved; the choice still holds until the page reloads.
    }
  };
  return [tab, choose];
}

/** Opens the building's official FIU page in a new tab, for ambassadors studying a stop. */
function WebsiteLink({ stop }: { stop: Stop }) {
  if (!stop.website) return null;
  const name = `Official FIU page for ${stop.name} (opens in a new tab)`;
  return (
    <a className="icon-btn" href={stop.website} target="_blank" rel="noopener noreferrer" aria-label={name} title={name}>
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
      </svg>
    </a>
  );
}
