import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { openMap } from "./helpers";

/**
 * Headless Chromium has no voices, so its speech never finishes. Replace speechSynthesis with a stand-in
 * that "speaks" each sentence in 60 ms and records what it said. The app's own speech code still runs.
 */
async function stubSpeech(page: Page) {
  await page.addInitScript(() => {
    const said: string[] = [];
    let queue: SpeechSynthesisUtterance[] = [];
    let timer: number | undefined;
    const pump = () => {
      if (timer !== undefined || queue.length === 0) return;
      const u = queue[0];
      u.onstart?.(new Event("start") as SpeechSynthesisEvent);
      timer = window.setTimeout(() => {
        timer = undefined;
        queue.shift();
        if (u.text.trim()) said.push(u.text);
        u.onend?.(new Event("end") as SpeechSynthesisEvent);
        pump();
      }, 60);
    };
    const fake = {
      speak(u: SpeechSynthesisUtterance) {
        queue.push(u);
        pump();
      },
      cancel() {
        const dropped = queue;
        queue = [];
        if (timer !== undefined) clearTimeout(timer);
        timer = undefined;
        for (const u of dropped) u.onerror?.({ error: "interrupted" } as SpeechSynthesisErrorEvent);
      },
      getVoices: () => [],
      addEventListener() {},
      removeEventListener() {},
    };
    Object.defineProperty(window, "speechSynthesis", { value: fake, configurable: true });
    (window as unknown as { __said: string[] }).__said = said;
  });
}

const said = (page: Page) => page.evaluate(() => (window as unknown as { __said: string[] }).__said);
const progress = (page: Page) => page.getByRole("region", { name: "Tour controls" });

async function shot(page: Page, info: TestInfo, name: string) {
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path });
  await info.attach(name, { path, contentType: "image/png" });
}

test.describe("Sprint 4: Tour Mode", () => {
  test.beforeEach(async ({ page }) => {
    await stubSpeech(page);
    await openMap(page);
  });

  test("virtual tour: Welcome narration, then the vehicle drives to stop 1 and narrates it", async ({ page }, info) => {
    await page.getByRole("button", { name: "Start tour" }).click();
    await shot(page, info, "start-sheet");
    await page.getByRole("button", { name: /virtual tour/i }).click();
    await expect(progress(page)).toContainText("Welcome");
    await expect(page.locator(".captions")).toContainText("thank you for joining us");
    await expect(page.getByRole("img", { name: "Tour vehicle" })).toBeVisible();
    await shot(page, info, "tour-welcome");

    // Auto-advance: Welcome narration ends, the vehicle drives to stop 1, and its narration plays.
    await expect(progress(page)).toContainText("Stop 1 of 32", { timeout: 20_000 });
    await expect.poll(async () => (await said(page)).some((s) => s.startsWith("The Student Academic Success Center opened in 2016"))).toBe(true);
    await shot(page, info, "tour-stop-1");

    // The vehicle and the current stop stay visible: not under the card or the controls.
    const card = (await page.locator(".info-card").boundingBox())!;
    const bar = (await progress(page).boundingBox())!;
    const v = (await page.getByRole("img", { name: "Tour vehicle" }).boundingBox())!;
    const inside = (a: typeof v, b: typeof v) => a.x + a.width / 2 > b.x && a.x + a.width / 2 < b.x + b.width && a.y + a.height / 2 > b.y && a.y + a.height / 2 < b.y + b.height;
    expect(inside(v, card), "vehicle hidden by the card").toBe(false);
    expect(inside(v, bar), "vehicle hidden by the controls").toBe(false);
  });

  test("ride-along: Next, Skip, a quick-pass stop with its badge, then Exit", async ({ page }, info) => {
    await page.getByRole("button", { name: "Start tour" }).click();
    await page.getByRole("button", { name: /ride-along/i }).click();
    await expect(progress(page)).toContainText("Ride-along");
    await page.getByRole("button", { name: "Next stop" }).click();
    await page.getByRole("button", { name: "Next stop" }).click();
    await expect(progress(page)).toContainText("Stop 2 of 32");
    await page.getByRole("button", { name: "Skip this stop" }).click();
    await expect(progress(page)).toContainText("Stop 3 of 32");
    await expect(progress(page)).toContainText("1 skipped");
    await expect(page.locator(".info-card")).toContainText("Under construction");
    await expect.poll(async () => (await said(page)).some((s) => s.startsWith("By the lake, the Trish and Dan Bell Chapel"))).toBe(true);
    await shot(page, info, "tour-bell-chapel");

    await page.getByRole("button", { name: "Exit tour" }).click();
    await expect(progress(page)).toHaveCount(0);
    await expect(page.getByRole("img", { name: "Tour vehicle" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Start tour" })).toBeVisible();
  });

  test("settings panel and 44 px controls", async ({ page }, info) => {
    await page.getByRole("button", { name: "Start tour" }).click();
    await page.getByRole("button", { name: /virtual tour/i }).click();
    for (const b of await progress(page).getByRole("button").all()) {
      const box = (await b.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole("button", { name: "Tour settings" }).click();
    await expect(page.getByRole("dialog", { name: "Tour settings" })).toBeVisible();
    await shot(page, info, "tour-settings");
  });
});
