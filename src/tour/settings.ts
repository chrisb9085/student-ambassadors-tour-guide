/** Tour settings kept on this device. Storage can be unavailable (private mode), so every access is guarded. */
export type TourSettings = {
  /** Speech speed, 0.8 to 1.3. */
  rate: number;
  /** Chosen voice, or null for the automatic pick. */
  voiceURI: string | null;
  /** Play recorded narration when the site has it (tools/narration-audio), instead of the device voice. */
  recorded: boolean;
};

/**
 * "Normal" is a little under the browser's 1.0, which sounds rushed for narration (Sprint 9).
 * Older saved speeds snap to the nearest option, so a radio button is always checked.
 */
export const RATE_OPTIONS = [
  { value: 0.85, label: "Slower" },
  { value: 0.95, label: "Normal" },
  { value: 1.1, label: "Faster" },
] as const;
export const DEFAULT_SETTINGS: TourSettings = { rate: 0.95, voiceURI: null, recorded: true };

const nearestRate = (r: number) =>
  RATE_OPTIONS.reduce<number>((best, o) => (Math.abs(o.value - r) < Math.abs(best - r) ? o.value : best), RATE_OPTIONS[0].value);

const KEY = "fiu-tour-settings";

export function loadSettings(): TourSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<TourSettings>;
    const rate = typeof parsed.rate === "number" && parsed.rate >= 0.8 && parsed.rate <= 1.3 ? nearestRate(parsed.rate) : DEFAULT_SETTINGS.rate;
    const voiceURI = typeof parsed.voiceURI === "string" ? parsed.voiceURI : null;
    const recorded = typeof parsed.recorded === "boolean" ? parsed.recorded : DEFAULT_SETTINGS.recorded;
    return { rate, voiceURI, recorded };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: TourSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Not fatal: settings just won't persist.
  }
}
