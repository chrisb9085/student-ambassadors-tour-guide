import { useEffect, useId, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import type { GuideNote } from "../content/types";
import { splitSentences } from "../tour/speech";
import { CARD_TABS, speakingTime, type CardTab } from "./cardTabs";

export type { CardTab };
import "./InfoCard.css";

export type CardScript = {
  /** The words to say (the narration, or the card read top to bottom). */
  text: string;
  /** Tour Mode: index of the sentence being spoken, highlighted while speaking. */
  current?: number | null;
  speaking?: boolean;
  /** Tour Mode labels the script "Narration"; study cards label it "What to say". */
  live?: boolean;
};

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
  /** Study notes for ambassadors: tips sit under the script, details under the facts. Never spoken. */
  guideNotes?: GuideNote[];
  /** With a script, the card has Script and Info tabs. Without one, it shows the facts only. */
  script?: CardScript;
  /** The open tab. Defaults to Info: ambassadors learn the facts first, then the words. */
  tab?: CardTab;
  onTabChange?: (tab: CardTab) => void;
  /** Buttons along the bottom (Previous, Next). */
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
  const { kicker, title, contentKey, badge, summary, stat, highlights, impact, guideNotes = [], script, footer, headerActions, onClose } = props;
  const { closeLabel = "Close", autoFocus = true, role = "dialog", onTabChange } = props;
  const tab: CardTab = script ? (props.tab ?? "info") : "info";
  const titleId = useId();
  const tabsId = useId();
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

  // Switching tabs starts the new tab at its top.
  useEffect(() => {
    bodyRef.current?.scrollTo?.({ top: 0 });
  }, [tab]);

  const tips = guideNotes.filter((n) => n.kind === "tip");
  const details = guideNotes.filter((n) => n.kind === "detail");
  const panelId = (t: CardTab) => `${tabsId}-${t}-panel`;
  const tabId = (t: CardTab) => `${tabsId}-${t}-tab`;

  // Arrow keys, Home and End move between tabs (WAI-ARIA tabs pattern, automatic activation).
  const onTabKey = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    const i = CARD_TABS.findIndex((t) => t.id === tab);
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % CARD_TABS.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + CARD_TABS.length) % CARD_TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = CARD_TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const id = CARD_TABS[next].id;
    onTabChange?.(id);
    document.getElementById(tabId(id))?.focus();
  };

  const facts = (
    <>
      <p className="info-card-summary">{summary}</p>
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
        <h3>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M12 20.5s-7.5-4.4-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.7-7.5 10.1-7.5 10.1Z" />
          </svg>
          Impact of support
        </h3>
        <p>{impact}</p>
      </div>
      {details.length > 0 && (
        <div className="info-card-more">
          <h3>Good to know</h3>
          <ul>
            {details.map((n) => (
              <li key={n.text}>
                {n.text} <span className="info-card-source">({n.source})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );

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

      {script && (
        <div className="info-card-tabs" role="tablist" aria-label={`${title}: views`}>
          {CARD_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={tabId(t.id)}
              aria-controls={panelId(t.id)}
              aria-selected={tab === t.id}
              tabIndex={tab === t.id ? 0 : -1}
              className="info-card-tab"
              onClick={() => onTabChange?.(t.id)}
              onKeyDown={onTabKey}
            >
              {t.id === "script" ? <ScriptIcon /> : <InfoIcon />}
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Focusable so keyboard users can scroll long cards with the arrow keys. */}
      <div className="info-card-body" ref={bodyRef} tabIndex={0} role="group" aria-label={`${title}: details`}>
        {script ? (
          <>
            <div id={panelId("script")} role="tabpanel" aria-labelledby={tabId("script")} hidden={tab !== "script"} className="info-card-panel">
              <ScriptView script={script} />
              {tips.map((n) => (
                <aside key={n.text} className="info-card-tip" aria-label="Tour guide tip">
                  <p className="info-card-tip-label">
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2V16h5v-.2c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3Z" />
                    </svg>
                    Tour guide tip
                  </p>
                  <p>{n.text}</p>
                  <p className="info-card-source">{n.source}</p>
                </aside>
              ))}
            </div>
            <div id={panelId("info")} role="tabpanel" aria-labelledby={tabId("info")} hidden={tab !== "info"} className="info-card-panel">
              {facts}
            </div>
          </>
        ) : (
          facts
        )}
      </div>

      {footer && <footer className="info-card-footer">{footer}</footer>}
    </section>
  );
}

/**
 * The script in large, easy-to-read type, one sentence per line so it can be learned a sentence at a time.
 * In Tour Mode the sentence being spoken is highlighted.
 */
function ScriptView({ script }: { script: CardScript }) {
  const sentences = splitSentences(script.text);
  const speaking = !!script.speaking;
  const label = speaking ? "Now speaking" : script.live ? "Narration" : "What to say";
  return (
    <figure className="script" data-speaking={speaking || undefined}>
      <figcaption className="script-head">
        <span className="script-label">
          {script.live && (
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M4 10v4h4l5 4V6L8 10H4Z" fill="currentColor" stroke="none" />
              {speaking && <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />}
            </svg>
          )}
          {label}
        </span>
        <span className="script-time">{speakingTime(script.text)}</span>
      </figcaption>
      <p className="script-text">
        {sentences.map((s, i) => (
          <span key={i} className={i === script.current ? "is-current" : undefined}>
            {s}{" "}
          </span>
        ))}
      </p>
    </figure>
  );
}

function ScriptIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 6.5C5 5.1 6.1 4 7.5 4h9C17.9 4 19 5.1 19 6.5v6c0 1.4-1.1 2.5-2.5 2.5H11l-4 4v-4h0.5C6.1 15 5 13.9 5 12.5v-6Z" />
      <path d="M9 8.5h6M9 11.5h4" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="7.8" r="0.6" fill="currentColor" />
    </svg>
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
