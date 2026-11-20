import { useEffect, useId, useRef, type ReactNode } from "react";
import type { GuideNote } from "../content/types";
import "./InfoCard.css";

export type InfoCardProps = {
  /** Small line above the title, e.g. "Stop 2 of 32 · Featured". */
  kicker: string;
  title: string;
  /** Changes when the card shows a different place, so focus moves to the new title. */
  contentKey: string;
  badge?: string | null;
  summary: string;
  stat?: { value: string; label: string } | null;
  highlights: string[];
  impact: string;
  /** Study notes for ambassadors, in a collapsed "For ambassadors" section. */
  guideNotes?: GuideNote[];
  /** Extra content above the highlights (Tour Mode puts its captions here). */
  children?: ReactNode;
  /** Buttons along the bottom (Previous, Next, Listen). */
  footer?: ReactNode;
  /** Small icon buttons in the header, before the close button (for example "Copy link"). */
  headerActions?: ReactNode;
  /** Omit for cards that can't be closed on their own (Tour Mode exits from its controls). */
  onClose?: () => void;
  closeLabel?: string;
  /** Move focus to the title when the place changes. Off in Tour Mode so focus stays on the controls. */
  autoFocus?: boolean;
  /** Region label for assistive tech; defaults to a dialog named by the title. */
  role?: "dialog" | "region";
};

/** A place card: popover-style side panel on wide screens, bottom sheet on narrow ones (see panels.css). */
export function InfoCard(props: InfoCardProps) {
  const { kicker, title, contentKey, badge, summary, stat, highlights, impact, guideNotes = [], children, footer, headerActions, onClose } = props;
  const { closeLabel = "Close", autoFocus = true, role = "dialog" } = props;
  const titleId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const closable = !!onClose;

  // Remember what opened the card and give focus back when it closes.
  useEffect(() => {
    if (!closable) return;
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current?.();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (opener && opener.isConnected && opener !== document.body) opener.focus();
    };
  }, [closable]);

  // New place: focus its title (unless told not to) and scroll back to the top.
  useEffect(() => {
    if (autoFocus) headingRef.current?.focus();
    bodyRef.current?.scrollTo?.({ top: 0 });
  }, [contentKey, autoFocus]);

  return (
    <section className="panel info-card" role={role} aria-labelledby={titleId}>
      <header className="info-card-header">
        <div className="info-card-titles">
          <p className="info-card-kicker">{kicker}</p>
          <h2 id={titleId} ref={headingRef} tabIndex={-1} className="info-card-title">
            <Title text={title} />
          </h2>
          {badge && (
            <p className="info-card-badge">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path fill="currentColor" d="M12 4a7 7 0 0 0-7 7v2H3v3h18v-3h-2v-2a7 7 0 0 0-7-7Zm-1 2.1V11h2V6.1a5 5 0 0 1 4 4.9v2H7v-2a5 5 0 0 1 4-4.9Z" />
              </svg>
              {badge}
            </p>
          )}
        </div>
        {headerActions}
        {closable && (
          <button type="button" className="icon-btn" onClick={onClose} aria-label={closeLabel}>
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </header>

      {/* Focusable so keyboard users can scroll long cards with the arrow keys. */}
      <div className="info-card-body" ref={bodyRef} tabIndex={0} role="group" aria-label={`${title}: details`}>
        <p className="info-card-summary">{summary}</p>
        {children}
        {stat && (
          <p className="info-card-stat">
            <span className="info-card-stat-value">{stat.value}</span>
            <span className="info-card-stat-label">{stat.label}</span>
          </p>
        )}
        {highlights.length > 0 && (
          <ul className="info-card-highlights">
            {highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        )}
        <div className="info-card-impact">
          <h3>Impact of support</h3>
          <p>{impact}</p>
        </div>
        {guideNotes.length > 0 && <GuideNotes key={contentKey} notes={guideNotes} />}
      </div>

      {footer && <footer className="info-card-footer">{footer}</footer>}
    </section>
  );
}

/**
 * Long official names ("Academic Health Center 3: Nicole Wertheim College of Nursing and Health Sciences")
 * show the part before the colon as a small line, so the title doesn't take four lines on a phone.
 * The heading's text is still the full name.
 */
function Title({ text }: { text: string }) {
  const i = text.indexOf(": ");
  if (i < 0) return <>{text}</>;
  return (
    <>
      <span className="info-card-title-prefix">{text.slice(0, i + 1)}</span> <span>{text.slice(i + 2)}</span>
    </>
  );
}

/** Collapsed by default; a native <details> works with touch, keyboard and screen readers. Resets per place. */
function GuideNotes({ notes }: { notes: GuideNote[] }) {
  const tips = notes.filter((n) => n.kind === "tip");
  const details = notes.filter((n) => n.kind === "detail");
  return (
    <details className="info-card-guide">
      <summary>For ambassadors</summary>
      <div className="info-card-guide-body">
        {tips.map((n) => (
          <div key={n.text} className="info-card-guide-tip">
            <p className="info-card-guide-label">Tour guide tip</p>
            <p>{n.text}</p>
            <p className="info-card-guide-source">{n.source}</p>
          </div>
        ))}
        {details.length > 0 && (
          <>
            <p className="info-card-guide-label">More to know</p>
            <ul className="info-card-guide-details">
              {details.map((n) => (
                <li key={n.text}>
                  {n.text} <span className="info-card-guide-source">({n.source})</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </details>
  );
}
