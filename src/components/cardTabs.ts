import { readingSeconds } from "../tour/speech";

/** The two views of a card: what the ambassador says, and the facts behind it. */
export type CardTab = "script" | "info";

export const CARD_TABS: { id: CardTab; label: string }[] = [
  { id: "info", label: "Info" },
  { id: "script", label: "Script" },
];

/** "About 35 seconds" or "About 1 min 10 sec", rounded to 5 seconds. */
export function speakingTime(text: string): string {
  const s = Math.max(5, Math.round(readingSeconds(text) / 5) * 5);
  if (s < 60) return `About ${s} seconds`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest ? `About ${m} min ${rest} sec` : `About ${m} min`;
}
