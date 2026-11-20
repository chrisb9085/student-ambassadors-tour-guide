import { useEffect, useId, useRef, type ReactNode } from "react";
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
  /** Extra content above the highlights (Tour Mode puts its captions here). */
  children?: ReactNode;
  /** Buttons along the bottom (Previous, Next, Listen). */
  footer?: ReactNode;
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
  const { kicker, title, contentKey, badge, summary, stat, highlights, impact, children, footer, onClose } = props;
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
            {title}
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
      </div>

      {footer && <footer className="info-card-footer">{footer}</footer>}
    </section>
  );
}
