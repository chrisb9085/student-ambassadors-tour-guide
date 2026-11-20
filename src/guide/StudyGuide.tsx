import { useEffect } from "react";
import { alsoOnCampus, routeStops, tour } from "../content";
import type { GuideNote, Stop, TourCard } from "../content/types";
import { statusBadge, typeLabel } from "../stops/describe";
import { narrationFor } from "../tour/steps";
import { STOP_PARAM } from "../lib/stopLink";
import "./StudyGuide.css";

/**
 * A printable study guide for ambassadors: every stop in driving order with what to say, the key facts and the
 * handbook's tour guide tips. Built from content/ like the map, so it never goes out of date. It leaves out the
 * Foundation's review notes. No map, so it needs no Mapbox token and costs no map loads.
 */
export function StudyGuide() {
  useEffect(() => {
    const previous = document.title;
    document.title = "Study guide · FIU Campus Tour";
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="guide">
      <header className="guide-header">
        <p className="guide-eyebrow">
          <span className="guide-fiu">FIU</span> Campus Tour
        </p>
        <h1>Study guide</h1>
        <p className="guide-intro">
          Every stop on the donor driving tour, in route order: what to say, the key facts, and the handbook's tour guide
          tips. Featured stops get the full story; quick-pass stops get a sentence or two.
        </p>
        <div className="guide-actions">
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
              <path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z" />
            </svg>
            Print
          </button>
          <a className="btn btn-secondary" href={window.location.pathname}>
            Back to the map
          </a>
        </div>
      </header>

      <main>
        <section aria-labelledby="guide-start">
          <h2 id="guide-start" className="guide-section-title">
            Start: Welcome
          </h2>
          <TourCardEntry card={tour.welcome} />
        </section>

        <section aria-labelledby="guide-route">
          <h2 id="guide-route" className="guide-section-title">
            Route stops, in driving order
          </h2>
          {routeStops.map((s) => (
            <StopEntry key={s.id} stop={s} />
          ))}
        </section>

        <section aria-labelledby="guide-also">
          <h2 id="guide-also" className="guide-section-title">
            Also on campus (not on the driving route)
          </h2>
          {alsoOnCampus.map((s) => (
            <StopEntry key={s.id} stop={s} />
          ))}
        </section>

        <section aria-labelledby="guide-end">
          <h2 id="guide-end" className="guide-section-title">
            End: Closing
          </h2>
          <TourCardEntry card={tour.closing} />
        </section>
      </main>
    </div>
  );
}

function StopEntry({ stop }: { stop: Stop }) {
  const badge = statusBadge(stop);
  const mapLink = `${window.location.pathname}?${STOP_PARAM}=${encodeURIComponent(stop.id)}`;
  return (
    <article className={`guide-stop guide-stop--${stop.type}`} aria-labelledby={`guide-${stop.id}`}>
      <header className="guide-stop-header">
        {stop.order !== null && (
          <span className="guide-stop-num" aria-hidden="true">
            {stop.order}
          </span>
        )}
        <div>
          <h3 id={`guide-${stop.id}`}>
            {stop.order !== null && <span className="visually-hidden">Stop {stop.order}: </span>}
            {stop.name}
          </h3>
          <p className="guide-stop-meta">
            {typeLabel(stop)}
            {badge && <span className="guide-badge">{badge}</span>}
            <a className="guide-map-link" href={mapLink} aria-label={`Show on map: ${stop.name}`}>
              Show on map
            </a>
          </p>
        </div>
      </header>
      <Body item={stop} notes={stop.guideNotes} sources={stop.sources} />
    </article>
  );
}

function TourCardEntry({ card }: { card: TourCard }) {
  return (
    <article className="guide-stop" aria-label={card.title}>
      <header className="guide-stop-header">
        <h3>{card.title}</h3>
      </header>
      <Body item={card} sources={card.sources} />
    </article>
  );
}

function Body({ item, notes = [], sources }: { item: Stop | TourCard; notes?: GuideNote[]; sources: string[] }) {
  const tips = notes.filter((n) => n.kind === "tip");
  const details = notes.filter((n) => n.kind === "detail");
  return (
    <div className="guide-stop-body">
      <div className="guide-say">
        <h4>What to say</h4>
        <p>{narrationFor(item)}</p>
      </div>
      <div className="guide-facts">
        <h4>Key facts</h4>
        <ul>
          {item.stat && (
            <li>
              <strong>{item.stat.value}</strong> {item.stat.label}
            </li>
          )}
          {item.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        <p>
          <strong>Impact of support:</strong> {item.impact}
        </p>
      </div>
      {tips.map((t) => (
        <div key={t.text} className="guide-tip">
          <h4>Tour guide tip</h4>
          <p>
            {t.text} <span className="guide-source">({t.source})</span>
          </p>
        </div>
      ))}
      {details.length > 0 && (
        <div className="guide-more">
          <h4>More to know</h4>
          <ul>
            {details.map((d) => (
              <li key={d.text}>
                {d.text} <span className="guide-source">({sourceLabel(d.source)})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="guide-sources">
        <span>Sources:</span> {sources.map(sourceLabel).join("; ")}
      </p>
    </div>
  );
}

/** "Handbook p.12" as is; URLs as their host and path, which reads better on paper. */
function sourceLabel(src: string): string {
  if (!src.startsWith("http")) return src;
  const u = new URL(src);
  return `${u.hostname}${u.pathname}`;
}
