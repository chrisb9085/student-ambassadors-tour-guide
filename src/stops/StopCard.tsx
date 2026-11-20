import type { Stop } from "../content/types";
import { InfoCard } from "../components/InfoCard";
import { shortLabel, statusBadge, typeLabel } from "./describe";

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
      onClose={onClose}
      closeLabel={`Close ${stop.name}`}
      footer={
        onRoute ? (
          <>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!prev}
              onClick={() => prev && onSelect(prev.id)}
              aria-label={prev ? `Previous stop: ${prev.name}` : "Previous stop"}
            >
              <span aria-hidden="true">‹</span>
              <span className="btn-label-truncate">{prev ? shortLabel(prev) : "Previous"}</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!next}
              onClick={() => next && onSelect(next.id)}
              aria-label={next ? `Next stop: ${next.name}` : "Next stop"}
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
