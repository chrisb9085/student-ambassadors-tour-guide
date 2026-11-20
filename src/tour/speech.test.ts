import { afterEach, describe, expect, it, vi } from "vitest";
import { createSpeaker, pickDefaultVoice, readingSeconds, splitSentences } from "./speech";
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "./settings";

/** Minimal stand-ins for the browser's speechSynthesis and SpeechSynthesisUtterance. */
class FakeUtterance {
  text: string;
  rate = 1;
  volume = 1;
  lang = "";
  voice: SpeechSynthesisVoice | null = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

function fakeSynth(voices: Partial<SpeechSynthesisVoice>[] = []) {
  const queue: FakeUtterance[] = [];
  return {
    queue,
    speak: vi.fn((u: FakeUtterance) => queue.push(u)),
    cancel: vi.fn(() => {
      for (const u of queue.splice(0)) u.onerror?.({ error: "interrupted" });
    }),
    getVoices: () => voices as SpeechSynthesisVoice[],
    /** Play the next queued utterance to the end. */
    playNext() {
      const u = queue.shift()!;
      u.onstart?.();
      u.onend?.();
      return u;
    },
  };
}

const make = (synth = fakeSynth()) =>
  createSpeaker(synth as unknown as SpeechSynthesis, FakeUtterance as unknown as typeof SpeechSynthesisUtterance);

describe("speech helpers", () => {
  it("splits narration into sentences", () => {
    expect(splitSentences("Welcome to FIU. It's big! Is it? Yes")).toEqual(["Welcome to FIU.", "It's big!", "Is it?", "Yes"]);
    expect(splitSentences("")).toEqual([]);
  });

  it("estimates reading time, never under 1.5 s", () => {
    expect(readingSeconds("one two three four five six seven eight nine ten")).toBe(4);
    expect(readingSeconds("Hi")).toBe(1.5);
    expect(readingSeconds("one two three four five six seven eight nine ten", 2)).toBe(2);
  });

  it("prefers natural-sounding English voices", () => {
    const v = (name: string, lang: string, extra: Partial<SpeechSynthesisVoice> = {}) => ({ name, lang, voiceURI: name, default: false, localService: true, ...extra }) as SpeechSynthesisVoice;
    const voices = [v("Thomas", "fr-FR"), v("Fred", "en-US"), v("Samantha", "en-US"), v("Microsoft Aria Online (Natural)", "en-US")];
    expect(pickDefaultVoice(voices)?.name).toBe("Microsoft Aria Online (Natural)");
    expect(pickDefaultVoice([v("Thomas", "fr-FR")])?.name).toBe("Thomas");
    expect(pickDefaultVoice([])).toBeNull();
  });
});

describe("createSpeaker with the Web Speech API", () => {
  it("unlock() speaks a silent utterance (iOS needs speech to start inside a tap)", () => {
    const synth = fakeSynth();
    make(synth).unlock();
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(synth.queue[0]).toMatchObject({ text: " ", volume: 0 });
  });

  it("speaks sentence by sentence at the chosen rate and voice, then resolves", async () => {
    const synth = fakeSynth([{ voiceURI: "ava", name: "Ava", lang: "en-US" }]);
    const onSentence = vi.fn();
    const done = make(synth).speak("First sentence. Second one.", { rate: 1.15, voiceURI: "ava", onSentence });
    expect(synth.queue.map((u) => u.text)).toEqual(["First sentence.", "Second one."]);
    expect(synth.queue[0]).toMatchObject({ rate: 1.15, lang: "en-US" });
    expect(synth.queue[0].voice?.name).toBe("Ava");
    synth.playNext();
    expect(onSentence).toHaveBeenLastCalledWith(0);
    synth.playNext();
    expect(onSentence).toHaveBeenLastCalledWith(1);
    await expect(done).resolves.toBe("ended");
  });

  it("cancel() stops speech and resolves the pending narration as cancelled", async () => {
    const synth = fakeSynth();
    const speaker = make(synth);
    const done = speaker.speak("One. Two.", { rate: 1, voiceURI: null });
    speaker.cancel();
    expect(synth.cancel).toHaveBeenCalled();
    await expect(done).resolves.toBe("cancelled");
  });

  it("a new narration cancels the previous one", async () => {
    const synth = fakeSynth();
    const speaker = make(synth);
    const first = speaker.speak("First.", { rate: 1, voiceURI: null });
    const second = speaker.speak("Second.", { rate: 1, voiceURI: null });
    await expect(first).resolves.toBe("cancelled");
    synth.playNext();
    await expect(second).resolves.toBe("ended");
  });
});

describe("createSpeaker without speech support (captions only)", () => {
  afterEach(() => vi.useRealTimers());

  it("steps through sentences on a reading-time timer so auto-advance still works muted", async () => {
    vi.useFakeTimers();
    const speaker = createSpeaker(undefined, undefined);
    expect(speaker.supported).toBe(false);
    const onSentence = vi.fn();
    const done = speaker.speak("Short one. Another short one.", { rate: 1, voiceURI: null, onSentence });
    expect(onSentence).toHaveBeenLastCalledWith(0);
    await vi.advanceTimersByTimeAsync(1500);
    expect(onSentence).toHaveBeenLastCalledWith(1);
    await vi.advanceTimersByTimeAsync(1500);
    await expect(done).resolves.toBe("ended");
    expect(speaker.voices()).toEqual([]);
  });
});

describe("tour settings storage", () => {
  afterEach(() => localStorage.clear());

  it("defaults, round-trips and rejects bad values", () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    saveSettings({ rate: 1.15, voiceURI: "ava" });
    expect(loadSettings()).toEqual({ rate: 1.15, voiceURI: "ava" });
    localStorage.setItem("fiu-tour-settings", JSON.stringify({ rate: 9, voiceURI: 4 }));
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    localStorage.setItem("fiu-tour-settings", "{not json");
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
