import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import type { Stop } from "../content/types";
import { statusBadge, typeLabel } from "./describe";
import "./StopList.css";
import { STUDY_GUIDE_SEARCH } from "../lib/view";

type Props = {
  id: string;
  routeStops: Stop[];
  otherStops: Stop[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
};

/** Numbered list of every stop in driving order, as an alternative to finding markers on the map. */
export function StopList({ id, routeStops, otherStops, selectedId, onSelect, onClose }: Props) {
  const titleId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Focus the selected (or first) stop when the list opens; Escape closes; focus returns to the opener.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const target =
      listRef.current?.querySelector<HTMLButtonElement>('[aria-current="true"]') ??
      listRef.current?.querySelector<HTMLButtonElement>(".stop-list-item");
    target?.focus();
    target?.scrollIntoView?.({ block: "nearest" });
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (opener && opener.isConnected && opener !== document.body) opener.focus();
    };
  }, []);

  // Arrow keys, Home and End move between stops.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(listRef.current?.querySelectorAll<HTMLButtonElement>(".stop-list-item") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: items.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    items[Math.max(0, Math.min(items.length - 1, to))].focus();
  };

  const item = (s: Stop) => {
    const badge = statusBadge(s);
    return (
      <li key={s.id}>
        <button
          type="button"
          className={`stop-list-item stop-list-item--${s.type}`}
          aria-current={s.id === selectedId ? "true" : undefined}
          onClick={() => onSelect(s.id)}
        >
          <span className="stop-list-num" aria-hidden="true">
            {s.order ?? "+"}
          </span>
          <span className="stop-list-text">
            <span className="stop-list-name">{s.name}</span>
            <span className="stop-list-meta">
              {s.order !== null && <span className="visually-hidden">Stop {s.order}. </span>}
              {s.type !== "featured" && <span className="tag">{typeLabel(s)}</span>}
              {badge && <span className="tag tag--construction">{badge}</span>}
            </span>
          </span>
        </button>
      </li>
    );
  };

  return (
    <section id={id} className="panel stop-list" aria-labelledby={titleId}>
      <header className="stop-list-header">
        <h2 id={titleId}>Tour stops</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close stop list">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>
      <div className="stop-list-body" ref={listRef} onKeyDown={onKeyDown}>
        <ol className="stop-list-items" aria-label="Driving route, in order">
          {routeStops.map(item)}
        </ol>
        {otherStops.length > 0 && (
          <>
            <h3 className="stop-list-subhead">Also on campus</h3>
            <ul className="stop-list-items">{otherStops.map(item)}</ul>
          </>
        )}
      </div>
      <footer className="stop-list-footer">
        <a className="btn btn-secondary" href={STUDY_GUIDE_SEARCH}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
            <path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z" />
          </svg>
          Printable study guide
        </a>
      </footer>
    </section>
  );
}
