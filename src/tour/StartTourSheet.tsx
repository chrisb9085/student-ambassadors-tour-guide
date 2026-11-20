import { useEffect, useId, useRef } from "react";
import type { TourMode } from "./useTour";
import "./StartTourSheet.css";

type Props = { onStart: (mode: TourMode) => void; onCancel: () => void };

/** Choose how to take the tour. Starting from this tap also unlocks speech on iOS. */
export function StartTourSheet({ onStart, onCancel }: Props) {
  const titleId = useId();
  const firstRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancelRef.current();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (opener?.isConnected && opener !== document.body) opener.focus();
    };
  }, []);

  return (
    <section className="panel start-sheet" role="dialog" aria-labelledby={titleId}>
      <h2 id={titleId}>Start the tour</h2>
      <p className="start-sheet-lead">The tour begins at the loop in front of MARC and visits each stop in driving order.</p>
      <button ref={firstRef} type="button" className="start-option" onClick={() => onStart("virtual")}>
        <span className="start-option-title">Virtual tour</span>
        <span className="start-option-text">Plays on its own, stop by stop. For guests at home or in a meeting.</span>
      </button>
      <button type="button" className="start-option" onClick={() => onStart("ride-along")}>
        <span className="start-option-title">Ride-along</span>
        <span className="start-option-text">For ambassadors in the vehicle. Tap Next as you reach each building.</span>
      </button>
      <button type="button" className="btn btn-secondary start-sheet-cancel" onClick={onCancel}>
        Cancel
      </button>
    </section>
  );
}
