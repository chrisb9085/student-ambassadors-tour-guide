/**
 * Mapbox paint properties can't read CSS variables, so map code resolves them here at runtime.
 * Colors are still defined only in src/styles/theme.css.
 */
export function cssVar(name: string, fallback: string, el: Element = document.documentElement): string {
  const value = getComputedStyle(el).getPropertyValue(name).trim();
  return value || fallback;
}
