import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createClipSpeaker, loadClipManifest, playbackRate, sentenceAt, silentWav, type ClipManifest } from "./clips";
import { FakeSpeaker } from "../test/fakeSpeaker";
import { buildSteps } from "./steps";
import { allStops, route, routeStops, tour } from "../content";
// The build-time generator's own copy of the narration text (plain JS). It must match what the app speaks.
import { narrationItems } from "../../tools/narration-audio/narration.mjs";

/** Just enough of an <audio> element: the test drives playback. */
class FakeAudio extends EventTarget {
  src = "";
  preload = "";
  paused = true;
  duration = NaN;
  currentTime = 0;
  playbackRate = 1;
  playResult: Promise<void> = Promise.resolve();
  play = vi.fn(() => {
    this.paused = false;
    return this.playResult;
  });
  pause() {
    this.paused = true;
  }
  at(seconds: number, duration = 10) {
    this.duration = duration;
    this.currentTime = seconds;
    this.dispatchEvent(new Event("timeupdate"));
  }
  end() {
    this.paused = true;
    this.dispatchEvent(new Event("ended"));
  }
  fail() {
    this.dispatchEvent(new Event("error"));
  }
}

const TEXT = "First sentence here. A second, longer sentence follows it.";
const MANIFEST: ClipManifest = { clips: { "graham-center": { file: "graham-center-abc.mp3", text: TEXT } } };

function setup(opts: { manifest?: ClipManifest | null; enabled?: boolean } = {}) {
  const audio = new FakeAudio();
  const fallback = new FakeSpeaker();
  const speaker = createClipSpeaker({
    fallback,
    manifest: opts.manifest === undefined ? MANIFEST : opts.manifest,
    enabled: opts.enabled ?? true,
    baseUrl: "/audio/",
    audio: audio as unknown as HTMLAudioElement,
  });
  return { audio, fallback, speaker };
}

describe("recorded narration clips (Sprint 11)", () => {
  it("plays the clip when its saved text matches the narration, at the chosen speed", async () => {
    const { audio, fallback, speaker } = setup();
    const onSentence = vi.fn();
    const done = speaker.speak(TEXT, { rate: 1.1, voiceURI: null, clipId: "graham-center", onSentence });
    expect(audio.src).toBe("/audio/graham-center-abc.mp3");
    expect(audio.play).toHaveBeenCalled();
    expect(audio.playbackRate).toBe(playbackRate(1.1));
    expect(fallback.spoken).toHaveLength(0);
    expect(speaker.playingClip).toBe(true);
    // Captions follow the playback position.
    expect(onSentence).toHaveBeenLastCalledWith(0);
    audio.at(8);
    expect(onSentence).toHaveBeenLastCalledWith(1);
    audio.end();
    await expect(done).resolves.toBe("ended");
    expect(speaker.playingClip).toBe(false);
  });

  it("uses the device voice when the text changed since the clip was made", async () => {
    const { audio, fallback, speaker } = setup();
    speaker.speak("Edited narration.", { rate: 1, voiceURI: null, clipId: "graham-center" });
    expect(audio.play).not.toHaveBeenCalled();
    expect(fallback.lastText).toBe("Edited narration.");
  });

  it("uses the device voice when there's no clip for this stop, no recordings at all, or recordings are turned off", () => {
    const noClip = setup();
    noClip.speaker.speak(TEXT, { rate: 1, voiceURI: null, clipId: "welcome" });
    const noManifest = setup({ manifest: null });
    noManifest.speaker.speak(TEXT, { rate: 1, voiceURI: null, clipId: "graham-center" });
    const off = setup({ enabled: false });
    off.speaker.speak(TEXT, { rate: 1, voiceURI: null, clipId: "graham-center" });
    for (const s of [noClip, noManifest, off]) {
      expect(s.audio.play).not.toHaveBeenCalled();
      expect(s.fallback.lastText).toBe(TEXT);
    }
  });

  it("configure() switches recordings on and off and swaps in a newly loaded manifest", () => {
    const { audio, fallback, speaker } = setup({ manifest: null });
    speaker.speak(TEXT, { rate: 1, voiceURI: null, clipId: "graham-center" });
    expect(fallback.lastText).toBe(TEXT);
    speaker.configure({ manifest: MANIFEST });
    speaker.speak(TEXT, { rate: 1, voiceURI: null, clipId: "graham-center" });
    expect(audio.play).toHaveBeenCalledTimes(1);
    speaker.configure({ enabled: false });
    speaker.speak(TEXT, { rate: 1, voiceURI: null, clipId: "graham-center" });
    expect(audio.play).toHaveBeenCalledTimes(1);
  });

  it("falls back to the device voice if the clip can't load or isn't allowed to play", async () => {
    const broken = setup();
    broken.speaker.speak(TEXT, { rate: 1, voiceURI: null, clipId: "graham-center" });
    broken.audio.fail();
    expect(broken.fallback.lastText).toBe(TEXT);

    const blocked = setup();
    blocked.audio.playResult = Promise.reject(new DOMException("no tap yet", "NotAllowedError"));
    blocked.speaker.speak(TEXT, { rate: 1, voiceURI: null, clipId: "graham-center" });
    await vi.waitFor(() => expect(blocked.fallback.lastText).toBe(TEXT));
  });

  it("cancel() stops the clip and resolves it as cancelled; a new narration replaces it", async () => {
    const { audio, speaker } = setup();
    const first = speaker.speak(TEXT, { rate: 1, voiceURI: null, clipId: "graham-center" });
    speaker.cancel();
    expect(audio.paused).toBe(true);
    await expect(first).resolves.toBe("cancelled");
    const second = speaker.speak(TEXT, { rate: 1, voiceURI: null, clipId: "graham-center" });
    const third = speaker.speak(TEXT, { rate: 1, voiceURI: null, clipId: "graham-center" });
    await expect(second).resolves.toBe("cancelled");
    audio.end();
    await expect(third).resolves.toBe("ended");
  });

  it("unlock() plays a silent sound inside the tap (iOS) and unlocks the device voice too", () => {
    const { audio, fallback, speaker } = setup();
    speaker.unlock();
    expect(audio.src).toMatch(/^data:audio\/wav;base64,/);
    expect(audio.play).toHaveBeenCalled();
    expect(fallback.unlocks).toBe(1);
  });

  it("builds a valid silent WAV", () => {
    const bytes = atob(silentWav(10).split(",")[1]);
    expect(bytes.slice(0, 4)).toBe("RIFF");
    expect(bytes.slice(8, 12)).toBe("WAVE");
    expect(bytes.length).toBe(54);
  });

  it("maps speeds so Normal plays the recording as recorded", () => {
    expect(playbackRate(0.95)).toBe(1);
    expect(playbackRate(0.85)).toBe(0.89);
    expect(playbackRate(1.1)).toBe(1.16);
  });

  it("picks the caption sentence by position, weighted by sentence length", () => {
    const s = ["Short.", "A much, much longer second sentence."];
    expect(sentenceAt(s, 0)).toBe(0);
    expect(sentenceAt(s, 0.1)).toBe(0);
    expect(sentenceAt(s, 0.5)).toBe(1);
    expect(sentenceAt(s, 1)).toBe(1);
  });

  it("loads the manifest, or null when there are no recordings", async () => {
    const ok = vi.fn().mockResolvedValue({ ok: true, json: async () => MANIFEST });
    await expect(loadClipManifest("/", ok as unknown as typeof fetch)).resolves.toEqual(MANIFEST);
    expect(ok).toHaveBeenCalledWith("/audio/manifest.json", { cache: "no-cache" });
    const missing = vi.fn().mockResolvedValue({ ok: false });
    await expect(loadClipManifest("/", missing as unknown as typeof fetch)).resolves.toBeNull();
    const html = vi.fn().mockResolvedValue({ ok: true, json: async () => Promise.reject(new SyntaxError("<!doctype")) });
    await expect(loadClipManifest("/", html as unknown as typeof fetch)).resolves.toBeNull();
    const empty = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ clips: {} }) });
    await expect(loadClipManifest("/", empty as unknown as typeof fetch)).resolves.toBeNull();
  });

  it("the generator records exactly the text the app speaks for every step and off-route card", () => {
    const stops = JSON.parse(readFileSync("content/stops.json", "utf8"));
    const tourJson = JSON.parse(readFileSync("content/tour.json", "utf8"));
    const generated = Object.fromEntries(narrationItems(stops, tourJson).map((i: { id: string; text: string }) => [i.id, i.text]));
    const { steps } = buildSteps(tour, routeStops, route);
    for (const step of steps) expect(generated[step.id], step.id).toBe(step.narration);
    expect(Object.keys(generated)).toHaveLength(steps.length + allStops.length - routeStops.length);
  });
});
