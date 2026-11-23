/** Query string that opens the study guide instead of the map. */
export const STUDY_GUIDE_SEARCH = "?view=study-guide";

/** Query string that opens Edit mode (sign-in required; see docs/ADMIN-HANDOVER.md). Not linked from the site. */
export const EDIT_MODE_SEARCH = "?view=edit";

export type View = "study-guide" | "edit" | "map";

/** Which page the URL asks for: the study guide, Edit mode, or the map (anything else). */
export function viewFor(search: string): View {
  const v = new URLSearchParams(search).get("view");
  return v === "study-guide" || v === "edit" ? v : "map";
}
