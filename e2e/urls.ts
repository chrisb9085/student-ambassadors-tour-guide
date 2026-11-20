/** Dev servers started by playwright.config.ts. */
export const URLS = {
  /** The token from .env.local. Used only by the real-map tests. */
  WITH_TOKEN: "http://localhost:5180",
  /** Same app with VITE_MAPBOX_TOKEN blanked, to test the missing-token screen. */
  NO_TOKEN: "http://localhost:5181",
  /**
   * Same app with a fake token. Every Mapbox request is answered by the stand-in (e2e/fixtures.ts), so these
   * tests need no .env.local and never reach Mapbox.
   */
  STAND_IN: "http://localhost:5182",
};
