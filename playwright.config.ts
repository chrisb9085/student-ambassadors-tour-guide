import { defineConfig, devices } from "@playwright/test";
import { URLS } from "./e2e/urls";

/**
 * End-to-end tests against the real dev server and the real Mapbox map.
 * The token comes from .env.local through Vite; tests never read or print it.
 * A second server runs with the token blanked to test the missing-token screen.
 */
const { WITH_TOKEN, NO_TOKEN } = URLS;
const CHROMIUM_GL = { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] };

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  timeout: 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  // Every test loads real Mapbox tiles: modest parallelism stays under Mapbox's per-minute rate limit
  // (heavy parallel runs got HTTP 429 in Sprint 6). WebKit runs serially via npm run test:e2e:webkit.
  workers: 2,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: WITH_TOKEN,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    // Chromium (Chrome and Edge), with software WebGL so Mapbox renders headless.
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 }, launchOptions: CHROMIUM_GL } },
    { name: "ipad-landscape", use: { viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: false, launchOptions: CHROMIUM_GL } },
    { name: "ipad-portrait", use: { viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: false, launchOptions: CHROMIUM_GL } },
    // WebKit, the engine behind Safari. Closest we can get to iPad and iPhone Safari without a device.
    // Headless WebKit on Windows renders WebGL in software and is slow, especially on a cold start and under
    // parallel load (Sprint 6). Run these serially (npm run test:e2e:webkit); one retry covers cold starts,
    // and a retried pass is reported as "flaky", never silently as "passed".
    { name: "webkit-ipad-landscape", retries: 1, use: { ...devices["iPad Pro 11 landscape"] } },
    { name: "webkit-ipad-portrait", retries: 1, use: { ...devices["iPad Pro 11"] } },
    { name: "webkit-iphone", retries: 1, use: { ...devices["iPhone 13"] } },
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
