import { defineConfig, devices } from "@playwright/test";
import { URLS } from "./e2e/urls";

/**
 * End-to-end tests against the real app and the real Mapbox GL JS library.
 *
 * Most tests use a local stand-in for Mapbox's servers (e2e/fixtures.ts): the map runs, but no request
 * reaches Mapbox, so runs cost no map loads and can't hit the rate limit. The few tests tagged @real-map
 * load real satellite tiles with the token from .env.local, in the "real-map" project only
 * (npm run test:e2e:real). Tests never read or print the token.
 */
const { WITH_TOKEN, NO_TOKEN, STAND_IN } = URLS;
const CHROMIUM_GL = { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] };
const STAND_IN_ONLY = { grepInvert: /@real-map/ };

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  timeout: 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  // Software WebGL is CPU-bound; more workers than this slows each test down. WebKit runs serially.
  workers: 3,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: STAND_IN,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    // Chromium (Chrome and Edge), with software WebGL so Mapbox renders headless.
    { name: "desktop", ...STAND_IN_ONLY, use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 }, launchOptions: CHROMIUM_GL } },
    { name: "ipad-landscape", ...STAND_IN_ONLY, use: { viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: false, launchOptions: CHROMIUM_GL } },
    { name: "ipad-portrait", ...STAND_IN_ONLY, use: { viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: false, launchOptions: CHROMIUM_GL } },
    // A phone turned sideways (Sprint 12): short screen, side-panel layout.
    { name: "phone-landscape", ...STAND_IN_ONLY, use: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: false, launchOptions: CHROMIUM_GL } },
    // WebKit, the engine behind Safari. Closest we can get to iPad and iPhone Safari without a device.
    // Headless WebKit on Windows renders WebGL in software and is slow, especially on a cold start. Run these
    // serially (npm run test:e2e:webkit); one retry covers cold starts, and a retried pass is reported as
    // "flaky", never silently as "passed".
    { name: "webkit-ipad-landscape", ...STAND_IN_ONLY, retries: 1, use: { ...devices["iPad Pro 11 landscape"] } },
    { name: "webkit-ipad-portrait", ...STAND_IN_ONLY, retries: 1, use: { ...devices["iPad Pro 11"] } },
    { name: "webkit-iphone", ...STAND_IN_ONLY, retries: 1, use: { ...devices["iPhone 13"] } },
    // Real Mapbox tiles: two map loads per run. Run before a release, not every change.
    { name: "real-map", grep: /@real-map/, use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 }, launchOptions: CHROMIUM_GL, baseURL: WITH_TOKEN } },
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
    {
      command: "npx vite --port 5182 --strictPort",
      url: STAND_IN,
      reuseExistingServer: false,
      timeout: 60_000,
      // Not a real token: the stand-in answers every Mapbox request.
      env: { VITE_MAPBOX_TOKEN: "pk.e2e-stand-in" },
    },
  ],
});
