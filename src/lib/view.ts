/** Query string that opens the study guide instead of the map. */
export const STUDY_GUIDE_SEARCH = "?view=study-guide";

/** Which page the URL asks for: the study guide (?view=study-guide) or the map (anything else). */
export function viewFor(search: string): "study-guide" | "map" {
  return new URLSearchParams(search).get("view") === "study-guide" ? "study-guide" : "map";
}
