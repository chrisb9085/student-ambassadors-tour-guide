/** Tour settings kept on this device. Storage can be unavailable (private mode), so every access is guarded. */
export type TourSettings = {
  /** Speech speed, 0.8 to 1.3. */
  rate: number;
  /** Chosen voice, or null for the automatic pick. */
  voiceURI: string | null;
};

export const DEFAULT_SETTINGS: TourSettings = { rate: 1, voiceURI: null };
export const RATE_OPTIONS = [
  { value: 0.85, label: "Slower" },
  { value: 1, label: "Normal" },
  { value: 1.15, label: "Faster" },
] as const;

const KEY = "fiu-tour-settings";

export function loadSettings(): TourSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<TourSettings>;
    const rate = typeof parsed.rate === "number" && parsed.rate >= 0.8 && parsed.rate <= 1.3 ? parsed.rate : DEFAULT_SETTINGS.rate;
    const voiceURI = typeof parsed.voiceURI === "string" ? parsed.voiceURI : null;
    return { rate, voiceURI };
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
