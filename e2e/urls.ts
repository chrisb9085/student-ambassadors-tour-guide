/** Dev servers started by playwright.config.ts. */
export const URLS = {
  WITH_TOKEN: "http://localhost:5180",
  /** Same app with VITE_MAPBOX_TOKEN blanked, to test the missing-token screen. */
  NO_TOKEN: "http://localhost:5181",
};
