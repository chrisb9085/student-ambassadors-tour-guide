import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from "react";
import { progressLabel, type TourStep } from "./steps";
import type { TourState } from "./useTour";
import { TourSettingsPanel, type TourSettingsPanelProps } from "./TourSettingsPanel";
import { TourStrip } from "./TourStrip";
import "./TourControls.css";

type Props = {
  state: TourState;
  step: TourStep;
  steps: TourStep[];
  last: number;
  /** Number of route stops, for "Stop 5 of 32". */
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onSkip: () => void;
  onTogglePlay: () => void;
  onExit: () => void;
  onRestart: () => void;
  settings: Omit<TourSettingsPanelProps, "id" | "onClose">;
};

const Icon = ({ d, fill = false }: { d: string; fill?: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

type BtnProps = { label: string; onClick: () => void; disabled?: boolean; primary?: boolean; children: ReactNode; buttonRef?: Ref<HTMLButtonElement> };

function Btn({ label, onClick, disabled, primary, children, buttonRef }: BtnProps) {
  return (
    <button ref={buttonRef} type="button" className={`btn ${primary ? "btn-primary" : "btn-secondary"} tour-btn`} onClick={onClick} disabled={disabled} aria-label={label} title={label}>
      {children}
    </button>
  );
}

/** Large tour controls: progress, Previous, Play/Pause, Next, Skip, settings and Exit. */
export function TourControls({ state, step, steps, last, total, onPrev, onNext, onSkip, onTogglePlay, onExit, onRestart, settings }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsId = useId();
  const finished = state.phase === "finished";
  const rideAlong = state.mode === "ride-along";
  const atStart = state.index === 0;
  const atEnd = state.index === last;
  const label = progressLabel(step, total);

  // Keyboard focus starts on the main control (the Start tour button that had it is gone), and moves
  // to Exit when the tour finishes and the button set changes.
  const primaryRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    primaryRef.current?.focus();
  }, [finished]);

  return (
    <div className="tour-controls" role="region" aria-label="Tour controls">
      <div className="tour-progress">
        <span className="tour-progress-label" aria-live="polite">
          {finished ? "Tour complete" : label}
          {state.skipped.length > 0 && <span className="tour-progress-skipped"> · {state.skipped.length} skipped</span>}
        </span>
        <span className="tour-progress-mode">{rideAlong ? "Ride-along" : "Virtual tour"}</span>
        <progress className="tour-progress-bar visually-hidden" max={last} value={state.index} aria-label={`Tour progress: ${label}`} />
        <TourStrip steps={steps} index={state.index} skipped={state.skipped} finished={finished} />
      </div>

      {finished ? (
        <div className="tour-buttons">
          <Btn label="Restart tour" onClick={onRestart}>
            <Icon d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" />
            <span className="tour-btn-text">Restart</span>
          </Btn>
          <Btn label="Exit tour" onClick={onExit} primary buttonRef={primaryRef}>
            <span className="tour-btn-text">Exit tour</span>
          </Btn>
        </div>
      ) : (
        <div className="tour-buttons">
          <Btn label="Previous stop" onClick={onPrev} disabled={atStart}>
            <Icon d="M15 6l-6 6 6 6" />
          </Btn>
          <Btn label={state.playing ? "Pause narration" : "Play narration"} onClick={onTogglePlay} primary={!rideAlong} buttonRef={rideAlong ? undefined : primaryRef}>
            {state.playing ? <Icon fill d="M7 5h4v14H7zM13 5h4v14h-4z" /> : <Icon fill d="M8 5v14l11-7z" />}
            <span className="tour-btn-text">{state.playing ? "Pause" : "Play"}</span>
          </Btn>
          <Btn label="Next stop" onClick={onNext} disabled={atEnd} primary={rideAlong} buttonRef={rideAlong ? primaryRef : undefined}>
            <span className="tour-btn-text">Next</span>
            <Icon d="M9 6l6 6-6 6" />
          </Btn>
          <Btn label="Skip this stop" onClick={onSkip} disabled={atEnd || step.kind !== "stop"}>
            <Icon d="M5 6l7 6-7 6M13 6l7 6-7 6" />
            <span className="tour-btn-text">Skip</span>
          </Btn>
          <button
            type="button"
            className="btn btn-secondary tour-btn"
            aria-label="Tour settings"
            title="Tour settings"
            aria-expanded={settingsOpen}
            aria-controls={settingsId}
            onClick={() => setSettingsOpen((o) => !o)}
          >
            <Icon d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
          </button>
          <Btn label="Exit tour" onClick={onExit}>
            <Icon d="M6 6l12 12M18 6L6 18" />
          </Btn>
        </div>
      )}

      {settingsOpen && !finished && <TourSettingsPanel id={settingsId} {...settings} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
