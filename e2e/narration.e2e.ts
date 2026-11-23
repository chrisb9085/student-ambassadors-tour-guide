import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { openMap } from "./helpers";
import { said, stubSpeech } from "./speech";
import tour from "../content/tour.json" with { type: "json" };
import stops from "../content/stops.json" with { type: "json" };
import { narrationFor } from "../tools/narration-audio/narration.mjs";

/** A silent WAV of the given length, served as the "recording" (real clips are MP3; any playable audio works). */
function silentWav(seconds: number): Buffer {
  const rate = 8000;
  const n = Math.round(rate * seconds);
  const b = Buffer.alloc(44 + n, 0x80);
  b.write("RIFF", 0);
  b.writeUInt32LE(36 + n, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate, 28);
  b.writeUInt16LE(1, 32);
  b.writeUInt16LE(8, 34);
  b.write("data", 36);
  b.writeUInt32LE(n, 40);
  return b;
}

const WELCOME = narrationFor(tour.welcome);
const STOP_1 = narrationFor(stops.find((s) => s.order === 1)!);

/** Serves a manifest with a recording for the Welcome narration only. */
async function serveRecordings(page: Page, clipSeconds = 1.5) {
  await page.route("**/audio/manifest.json", (r) =>
    r.fulfill({ json: { provider: "test", voice: "test", clips: { welcome: { file: "welcome-test.wav", text: WELCOME } } } }),
  );
  await page.route("**/audio/welcome-test.wav", (r) => r.fulfill({ body: silentWav(clipSeconds), contentType: "audio/wav" }));
}

const progress = (page: Page) => page.getByRole("region", { name: "Tour controls" });

test.describe("Sprint 11: recorded narration", () => {
  test.beforeEach(async ({ page }) => {
    await stubSpeech(page);
  });

  test("plays the recording when there is one, and the device voice for stops without one", async ({ page, browserName }) => {
    // Playwright's WebKit build on Windows has no media backend: play() fails with NotSupportedError even for
    // formats canPlayType() accepts (checked in Sprint 11). Real Safari plays MP3s; here the test checks the
    // other half of the design instead: a clip that can't play falls back to the device voice, never silence.
    test.skip(browserName === "webkit", "No audio playback in Playwright's WebKit on Windows; covered by the fallback test below");
    await serveRecordings(page);
    await openMap(page);
    await page.getByRole("button", { name: "Start tour" }).click();
    await page.getByRole("button", { name: /virtual tour/i }).click();
    await expect(page.locator(".script")).toContainText("thank you for joining us");
    // The clip ends on its own (no __finishSpeech), then the tour drives on and stop 1 uses the device voice.
    await expect(progress(page)).toContainText("Stop 1 of 32", { timeout: 20_000 });
    await expect.poll(() => said(page)).toContain(STOP_1.split(/(?<=\.)\s/)[0]);
    expect((await said(page)).some((s) => WELCOME.startsWith(s))).toBe(false);
  });

  test("a recording that can't play falls back to the device voice, never silence", async ({ page }) => {
    await serveRecordings(page);
    // Break the clip: the server answers with something that isn't audio.
    await page.route("**/audio/welcome-test.wav", (r) => r.fulfill({ body: "not audio", contentType: "audio/wav" }));
    await openMap(page);
    await page.getByRole("button", { name: "Start tour" }).click();
    await page.getByRole("button", { name: /ride-along/i }).click();
    await expect.poll(async () => (await said(page)).some((s) => WELCOME.startsWith(s))).toBe(true);
  });

  test("settings offer the recorded voice or the device voice", async ({ page }) => {
    await serveRecordings(page, 30);
    await openMap(page);
    await page.getByRole("button", { name: "Start tour" }).click();
    await page.getByRole("button", { name: /ride-along/i }).click();
    await page.getByRole("button", { name: "Tour settings" }).click();
    const panel = page.getByRole("dialog", { name: "Tour settings" });
    await expect(panel.getByRole("radio", { name: /recorded/i })).toBeChecked();
    await panel.getByRole("radio", { name: /this device/i }).click();
    await page.keyboard.press("Escape");
    // Replay the Welcome: now with the device voice.
    await page.getByRole("button", { name: "Pause narration" }).click();
    await page.getByRole("button", { name: "Play narration" }).click();
    await expect.poll(async () => (await said(page)).some((s) => WELCOME.startsWith(s))).toBe(true);
  });

  test("without recordings, nothing changes: no voice choice, device voice only", async ({ page }) => {
    await openMap(page);
    await page.getByRole("button", { name: "Start tour" }).click();
    await page.getByRole("button", { name: /ride-along/i }).click();
    await expect.poll(async () => (await said(page)).some((s) => WELCOME.startsWith(s))).toBe(true);
    await page.getByRole("button", { name: "Tour settings" }).click();
    await expect(page.getByRole("dialog", { name: "Tour settings" }).getByRole("radio", { name: /recorded/i })).toHaveCount(0);
  });
});
