/** Reads the public Mapbox token from the environment. Returns null when it is missing or not a public token. */
export function getMapboxToken(env: Record<string, string | undefined> = import.meta.env): string | null {
  const token = env.VITE_MAPBOX_TOKEN?.trim();
  if (!token || !token.startsWith("pk.")) return null;
  return token;
}
