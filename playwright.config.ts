import { defineConfig, devices } from "@playwright/test";
import { URLS } from "./e2e/urls";

/**
 * End-to-end tests against the real dev server and the real Mapbox map.
 * The token comes from .env.local through Vite; tests never read or print it.
 * A second server runs with the token blanked to test the missing-token screen.
 */
const { WITH_TOKEN, NO_TOKEN } = URLS;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  timeout: 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: WITH_TOKEN,
    // Software WebGL so Mapbox renders in headless Chromium.
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 } } },
    // iPad-sized viewport (Chromium engine; real Safari testing happens in Sprint 6).
    { name: "ipad-landscape", use: { viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: false } },
    { name: "ipad-portrait", use: { viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: false } },
  ],
  webServer: [
    { command: "npx vite --port 5180 --strictPort", url: WITH_TOKEN, reuseExistingServer: false, timeout: 60_000 },
    {
      command: "npx vite --port 5181 --strictPort",
      url: NO_TOKEN,
      reuseExistingServer: false,
      timeout: 60_000,
      // Variables already in the environment take priority over .env files in Vite.
      env: { VITE_MAPBOX_TOKEN: "" },
    },
  ],
});
