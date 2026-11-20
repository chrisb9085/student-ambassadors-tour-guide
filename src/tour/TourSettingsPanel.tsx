import { useEffect, useId, useRef } from "react";
import { RATE_OPTIONS } from "./settings";

export type TourSettingsPanelProps = {
  id: string;
  autoAdvance: boolean;
  onAutoAdvance: (on: boolean) => void;
  rate: number;
  onRate: (rate: number) => void;
  voices: { voiceURI: string; name: string; lang: string }[];
  /** null means "Automatic" (best available voice). */
  voiceURI: string | null;
  onVoice: (voiceURI: string | null) => void;
  speechSupported: boolean;
  /** The site has recorded narration (public/audio/manifest.json). */
  recordings: boolean;
  recorded: boolean;
  onRecorded: (on: boolean) => void;
  onClose: () => void;
};

/** Auto-advance, speech speed and voice. */
export function TourSettingsPanel(p: TourSettingsPanelProps) {
  const titleId = useId();
  const firstRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(p.onClose);
  useEffect(() => {
    onCloseRef.current = p.onClose;
  }, [p.onClose]);

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section id={p.id} className="tour-settings" role="dialog" aria-labelledby={titleId}>
      <header className="tour-settings-header">
        <h2 id={titleId}>Tour settings</h2>
        <button type="button" className="icon-btn" aria-label="Close tour settings" onClick={p.onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <label className="setting-row setting-switch">
        <span>
          <span className="setting-name">Auto-advance</span>
          <span className="setting-hint">Move to the next stop when narration ends</span>
        </span>
        <input ref={firstRef} type="checkbox" role="switch" checked={p.autoAdvance} onChange={(e) => p.onAutoAdvance(e.target.checked)} />
      </label>

      <fieldset className="setting-row">
        <legend className="setting-name">Speech speed</legend>
        <div className="segmented">
          {RATE_OPTIONS.map((o) => (
            <label key={o.value} className="segmented-option">
              <input type="radio" name={`${p.id}-rate`} value={o.value} checked={p.rate === o.value} onChange={() => p.onRate(o.value)} />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {p.recordings && (
        <fieldset className="setting-row">
          <legend className="setting-name">Narration voice</legend>
          <div className="segmented">
            <label className="segmented-option">
              <input type="radio" name={`${p.id}-source`} checked={p.recorded} onChange={() => p.onRecorded(true)} />
              <span>Recorded</span>
            </label>
            <label className="segmented-option">
              <input type="radio" name={`${p.id}-source`} checked={!p.recorded} onChange={() => p.onRecorded(false)} />
              <span>This device</span>
            </label>
          </div>
          <span className="setting-hint">Recorded narration sounds the same on every device. Changes apply from the next stop.</span>
        </fieldset>
      )}

      {p.speechSupported ? (
        <label className="setting-row">
          <span className="setting-name">Voice</span>
          <select value={p.voiceURI ?? ""} onChange={(e) => p.onVoice(e.target.value || null)}>
            <option value="">Automatic (best available)</option>
            {p.voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
          <span className="setting-hint">
            {p.recordings && p.recorded ? "Used for any stop without a recording. " : ""}Voices depend on this device.
          </span>
        </label>
      ) : (
        <p className="setting-hint">Spoken narration isn't available in this browser. Captions still advance on their own.</p>
      )}
    </section>
  );
}
