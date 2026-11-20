/**
 * Recorded narration: plays pre-generated MP3 clips (tools/narration-audio) through one <audio> element, and
 * falls back to the browser voice for any narration without a matching clip.
 *
 * - A clip plays only when the text saved with it equals the narration being spoken, so edited copy never
 *   plays a stale recording.
 * - iOS only lets an <audio> element play after a tap. unlock() plays a silent sound on the shared element
 *   inside the tap; later clips started from timers then play on the same element.
 * - Captions: clips have no word timings, so the highlighted sentence follows the playback position,
 *   in proportion to each sentence's length.
 * - Speed: "Normal" (0.95 for the device voice) plays clips at their recorded speed.
 */
import { splitSentences, type SpeakOptions, type SpeakResult, type Speaker } from "./speech";

export type ClipManifest = { provider?: string; voice?: string; clips: Record<string, { file: string; text: string }> };

/** Speech speed setting → audio playback rate, with Normal at the recording's own speed. */
export const NORMAL_RATE = 0.95;
export const playbackRate = (rate: number) => Math.round((rate / NORMAL_RATE) * 100) / 100;

/** Loads public/audio/manifest.json. Resolves null when there are no recordings (or the file isn't JSON). */
export async function loadClipManifest(base: string, fetchImpl: typeof fetch = fetch): Promise<ClipManifest | null> {
  try {
    const res = await fetchImpl(`${base}audio/manifest.json`, { cache: "no-cache" });
    if (!res.ok) return null;
    const m = (await res.json()) as ClipManifest;
    return m && typeof m.clips === "object" && Object.keys(m.clips).length > 0 ? m : null;
  } catch {
    return null; // e.g. the dev server answered with index.html
  }
}

/** Index of the sentence being heard at a fraction (0 to 1) of the clip, weighting sentences by length. */
export function sentenceAt(sentences: string[], fraction: number): number {
  const total = sentences.reduce((n, s) => n + s.length, 0);
  let acc = 0;
  for (let i = 0; i < sentences.length; i++) {
    acc += sentences[i].length;
    if (fraction * total < acc) return i;
  }
  return Math.max(0, sentences.length - 1);
}

/** 0.1 s of silence as a WAV data URL (8 kHz, 8-bit mono), played inside a tap to unlock the audio element on iOS. */
export function silentWav(samples = 800): string {
  const bytes = new Uint8Array(44 + samples);
  const view = new DataView(bytes.buffer);
  const text = (at: number, s: string) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, 36 + samples, true);
  text(8, "WAVEfmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, 8000, true); // sample rate
  view.setUint32(28, 8000, true); // byte rate
  view.setUint16(32, 1, true); // block align
  view.setUint16(34, 8, true); // bits per sample
  text(36, "data");
  view.setUint32(40, samples, true);
  bytes.fill(0x80, 44); // 8-bit silence is the midpoint
  return `data:audio/wav;base64,${btoa(String.fromCharCode(...bytes))}`;
}
const SILENCE = silentWav();

type ClipSettings = {
  manifest: ClipManifest | null;
  /** False when the listener chose the device voice in settings. */
  enabled: boolean;
};

type ClipSpeakerOptions = Partial<ClipSettings> & {
  fallback: Speaker;
  /** Folder the manifest's file names are relative to, e.g. "/audio/". */
  baseUrl: string;
  audio?: HTMLAudioElement;
};

export type ClipSpeaker = Speaker & {
  /** True while the current narration is a recording. */
  readonly playingClip: boolean;
  /** Update when the manifest arrives or the listener changes the voice setting. Applies from the next narration. */
  configure(settings: Partial<ClipSettings>): void;
};

export function createClipSpeaker({ fallback, baseUrl, audio = new Audio(), ...initial }: ClipSpeakerOptions): ClipSpeaker {
  const config: ClipSettings = { manifest: initial.manifest ?? null, enabled: initial.enabled ?? true };
  audio.preload = "auto";
  let token = 0;
  let finish: ((r: SpeakResult) => void) | null = null;
  let detach: (() => void) | null = null;
  let playingClip = false;

  const stopClip = () => {
    token++;
    detach?.();
    detach = null;
    playingClip = false;
    if (!audio.paused) audio.pause();
    finish?.("cancelled");
    finish = null;
  };

  const clipFor = (text: string, id: string | undefined) => {
    if (!id || !config.enabled) return null;
    const c = config.manifest?.clips[id];
    return c && c.text === text ? c : null;
  };

  return {
    get supported() {
      return true; // clips or captions-on-a-timer always work; the device voice may not
    },
    get playingClip() {
      return playingClip;
    },

    configure(settings) {
      Object.assign(config, settings);
    },

    unlock() {
      fallback.unlock();
      // Must run synchronously inside the tap. Errors (no audio support) aren't fatal.
      if (audio.paused) {
        audio.src = SILENCE;
        audio.play()?.catch(() => {});
      }
    },

    speak(text: string, options: SpeakOptions): Promise<SpeakResult> {
      stopClip();
      fallback.cancel();
      const clip = clipFor(text, options.clipId);
      if (!clip) return fallback.speak(text, options);

      const mine = ++token;
      const sentences = splitSentences(text);
      playingClip = true;
      return new Promise<SpeakResult>((resolve) => {
        finish = resolve;
        const done = (r: SpeakResult) => {
          if (mine !== token) return;
          detach?.();
          detach = null;
          finish = null;
          playingClip = false;
          resolve(r);
        };
        // A missing or unplayable clip falls back to the device voice instead of going silent.
        const toFallback = () => {
          if (mine !== token) return;
          detach?.();
          detach = null;
          finish = null;
          playingClip = false;
          fallback.speak(text, options).then(resolve);
        };
        let last = -1;
        const onTime = () => {
          if (!audio.duration || !Number.isFinite(audio.duration)) return;
          const i = sentenceAt(sentences, audio.currentTime / audio.duration);
          if (i !== last) {
            last = i;
            options.onSentence?.(i);
          }
        };
        const onEnded = () => done("ended");
        audio.addEventListener("timeupdate", onTime);
        audio.addEventListener("ended", onEnded);
        audio.addEventListener("error", toFallback);
        detach = () => {
          audio.removeEventListener("timeupdate", onTime);
          audio.removeEventListener("ended", onEnded);
          audio.removeEventListener("error", toFallback);
        };

        audio.src = `${baseUrl}${clip.file}`;
        audio.playbackRate = playbackRate(options.rate);
        options.onSentence?.(0);
        last = 0;
        const played = audio.play();
        // NotAllowedError (no tap yet) or a decode failure: use the device voice.
        played?.catch(toFallback);
      });
    },

    cancel() {
      stopClip();
      fallback.cancel();
    },

    voices: () => fallback.voices(),
    onVoicesChanged: (cb) => fallback.onVoicesChanged(cb),
  };
}
