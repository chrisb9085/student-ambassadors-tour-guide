/**
 * Shareable stop links: ?stop=graham-center opens that stop's card, so an advisor can point ambassadors at
 * a building. The address bar follows the open card (replaceState, so Back isn't filled with every card).
 */
export const STOP_PARAM = "stop";

/** The stop id in a URL's query string, if it names a known stop. */
export function stopIdFromSearch(search: string, knownIds: readonly string[]): string | null {
  const id = new URLSearchParams(search).get(STOP_PARAM);
  return id && knownIds.includes(id) ? id : null;
}

/** The same URL with ?stop= set to the id, or removed when id is null. Other parameters are kept. */
export function urlWithStop(href: string, id: string | null): string {
  const url = new URL(href);
  if (id) url.searchParams.set(STOP_PARAM, id);
  else url.searchParams.delete(STOP_PARAM);
  return url.toString();
}

/** Copies text to the clipboard. Resolves false when the browser refuses (no permission, insecure page). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
