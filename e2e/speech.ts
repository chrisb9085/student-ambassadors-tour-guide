import type { Page } from "@playwright/test";

/**
 * Headless browsers have no voices, so real speech never finishes. Replace speechSynthesis with a stand-in
 * that records each sentence as soon as it's queued, but only finishes speaking when the test calls
 * __finishSpeech(), which plays the current narration to its end. The test controls time, so a virtual
 * tour can't run ahead of its assertions (it did, under load, when the stand-in finished sentences on its
 * own). The app's own speech code still runs.
 */
export async function stubSpeech(page: Page) {
  await page.addInitScript(() => {
    const said: string[] = [];
    let queue: SpeechSynthesisUtterance[] = [];
    const start = () => queue[0]?.onstart?.(new Event("start") as SpeechSynthesisEvent);
    // The app speaks one sentence at a time with a short pause between them, so keep finishing sentences
    // until the narration has been quiet for 750 ms: longer than the pause between sentences, shorter
    // than the wait before auto-advance, so the next stop's narration is never finished by accident.
    (window as unknown as { __finishSpeech: () => Promise<void> }).__finishSpeech = async () => {
      for (let quiet = 0; quiet < 3; ) {
        if (queue.length) {
          quiet = 0;
          while (queue.length) {
            const u = queue.shift()!;
            u.onend?.(new Event("end") as SpeechSynthesisEvent);
            start();
          }
        } else quiet++;
        await new Promise((r) => setTimeout(r, 250));
      }
    };
    const fake = {
      speak(u: SpeechSynthesisUtterance) {
        queue.push(u);
        if (u.text.trim()) said.push(u.text);
        if (queue.length === 1) start();
      },
      cancel() {
        const dropped = queue;
        queue = [];
        for (const u of dropped) u.onerror?.({ error: "interrupted" } as SpeechSynthesisErrorEvent);
      },
      getVoices: () => [],
      addEventListener() {},
      removeEventListener() {},
    };
    Object.defineProperty(window, "speechSynthesis", { value: fake, configurable: true });
    // Playwright's WebKit build has no Web Speech API at all (real Safari does), so supply the utterance class too.
    if (typeof window.SpeechSynthesisUtterance !== "function") {
      class Utterance {
        text: string;
        rate = 1;
        volume = 1;
        lang = "";
        voice: SpeechSynthesisVoice | null = null;
        onstart: ((e: Event) => void) | null = null;
        onend: ((e: Event) => void) | null = null;
        onerror: ((e: Event) => void) | null = null;
        constructor(text: string) {
          this.text = text;
        }
      }
      Object.defineProperty(window, "SpeechSynthesisUtterance", { value: Utterance, configurable: true });
    }
    (window as unknown as { __said: string[] }).__said = said;
  });
}

export const said = (page: Page) => page.evaluate(() => (window as unknown as { __said: string[] }).__said);
/** Let the current narration play to its end. */
export const finishSpeech = (page: Page) => page.evaluate(() => (window as unknown as { __finishSpeech: () => Promise<void> }).__finishSpeech());
