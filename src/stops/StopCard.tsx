import { useEffect, useState } from "react";
import type { Stop } from "../content/types";
import { copyText, urlWithStop } from "../lib/stopLink";
import { InfoCard, type CardSize, type CardTab } from "../components/InfoCard";
import { narrationFor } from "../tour/steps";
import { buttonName, shortLabel, statusBadge, typeLabel } from "./describe";

type Props = {
  stop: Stop;
  total: number;
  prev: Stop | null;
  next: Stop | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  /** Expanded or not (see cardSize.ts). Without onSizeChange the card has no Expand button. */
  size?: CardSize;
  onSizeChange?: (size: CardSize) => void;
};

/** The card for one stop, with Previous and Next along the route. */
export function StopCard({ stop, total, prev, next, onSelect, onClose, size, onSizeChange }: Props) {
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
      size={size}
      onSizeChange={onSizeChange}
      closeLabel={`Close ${stop.name}`}
      headerActions={<CopyLinkButton key={stop.id} stopId={stop.id} />}
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

/** Copies a link that opens this stop's card, for advisors to send to ambassadors. */
function CopyLinkButton({ stopId }: { stopId: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => {
    if (status !== "copied") return;
    const t = setTimeout(() => setStatus("idle"), 2500);
    return () => clearTimeout(t);
  }, [status]);

  return (
    <>
      <button
        type="button"
        className="icon-btn"
        aria-label="Copy link to this stop"
        title="Copy link to this stop"
        onClick={async () => {
          const link = urlWithStop(window.location.href, stopId);
          if (await copyText(link)) return setStatus("copied");
          // No clipboard access (for example an iPad on a plain http:// address): show the link to copy by hand.
          setStatus("failed");
          window.prompt("Copy this link to the stop:", link);
        }}
      >
        {status === "copied" ? (
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
          </svg>
        )}
      </button>
      <span className="visually-hidden" role="status">
        {status === "copied" ? "Link copied" : ""}
      </span>
    </>
  );
}
