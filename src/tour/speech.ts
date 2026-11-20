/**
 * Narration through the Web Speech API (speechSynthesis), with a captions-only fallback.
 *
 * - Text is spoken one sentence at a time. Chrome stops long utterances after about 15 seconds, and
 *   sentence boundaries let the captions highlight what's being said.
 * - iOS Safari only allows speech that starts inside a tap. Call unlock() synchronously in the
 *   Start or Play click handler; later narration started from timers then works.
 * - Without speech support, speak() waits for a reading-time estimate, so auto-advance still works muted.
 */
export type SpeakOptions = {
  rate: number;
  voiceURI: string | null;
  /** Called with the index of the sentence that starts playing. */
  onSentence?: (index: number) => void;
};

export type SpeakResult = "ended" | "cancelled" | "error";

export type Speaker = {
  readonly supported: boolean;
  unlock(): void;
  speak(text: string, options: SpeakOptions): Promise<SpeakResult>;
  cancel(): void;
  voices(): SpeechSynthesisVoice[];
  onVoicesChanged(cb: () => void): () => void;
};

/** A period after one of these isn't a sentence end: initials ("Robert A. M. Stern") and short titles. */
const NOT_A_SENTENCE_END = /(?:^|\s)(?:[A-Z]|Dr|Mr|Mrs|Ms|St|Jr|Sr|Ave)\.$/;

/** Splits narration into sentences, keeping the punctuation, without breaking at initials. */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  for (const m of text.matchAll(/[.!?]+["')\]]*(?=\s|$)/g)) {
    const end = m.index + m[0].length;
    const chunk = text.slice(start, end);
    if (m[0].startsWith(".") && NOT_A_SENTENCE_END.test(chunk)) continue;
    out.push(chunk.trim());
    start = end;
  }
  const rest = text.slice(start).trim();
  if (rest) out.push(rest);
  return out.filter(Boolean);
}

/** Seconds to read a sentence aloud, used when there's no speech engine (about 150 words a minute). */
export function readingSeconds(text: string, rate = 1): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1.5, words / (2.5 * rate));
}

/** Picks a natural-sounding English voice when the device offers one. */
export function pickDefaultVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const english = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  if (english.length === 0) return voices[0] ?? null;
  const score = (v: SpeechSynthesisVoice) =>
    (/natural|neural|enhanced|premium/i.test(v.name) ? 4 : 0) +
    (/samantha|ava|allison|aria|jenny|google us english/i.test(v.name) ? 2 : 0) +
    (v.lang.toLowerCase() === "en-us" ? 1 : 0) +
    (v.default ? 0.5 : 0);
  return [...english].sort((a, b) => score(b) - score(a))[0];
}

type SynthLike = Pick<SpeechSynthesis, "speak" | "cancel" | "getVoices"> & {
  addEventListener?: SpeechSynthesis["addEventListener"];
  removeEventListener?: SpeechSynthesis["removeEventListener"];
};

type UtteranceCtor = new (text: string) => SpeechSynthesisUtterance;

export function createSpeaker(
  synth: SynthLike | undefined = typeof window !== "undefined" ? window.speechSynthesis : undefined,
  Utterance: UtteranceCtor | undefined = typeof window !== "undefined" ? window.SpeechSynthesisUtterance : undefined,
): Speaker {
  const supported = !!synth && !!Utterance;
  // Each speak() gets a token; cancel() or a newer speak() invalidates older ones.
  let current = 0;
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  let finishCurrent: ((r: SpeakResult) => void) | null = null;

  const stopAll = () => {
    current++;
    if (fallbackTimer) clearTimeout(fallbackTimer);
    fallbackTimer = null;
    if (supported) synth!.cancel();
    finishCurrent?.("cancelled");
    finishCurrent = null;
  };

  return {
    supported,

    unlock() {
      if (!supported) return;
      const u = new Utterance!(" ");
      u.volume = 0;
      synth!.speak(u);
    },

    speak(text, { rate, voiceURI, onSentence }) {
      stopAll();
      const token = current;
      const sentences = splitSentences(text);
      return new Promise<SpeakResult>((resolve) => {
        finishCurrent = resolve;
        const done = (r: SpeakResult) => {
          if (token !== current) return;
          finishCurrent = null;
          resolve(r);
        };

        if (!supported) {
          // Captions only: step through sentences on a timer.
          const next = (i: number) => {
            if (token !== current) return;
            if (i >= sentences.length) return done("ended");
            onSentence?.(i);
            fallbackTimer = setTimeout(() => next(i + 1), readingSeconds(sentences[i], rate) * 1000);
          };
          next(0);
          return;
        }

        const voice = voiceURI ? synth!.getVoices().find((v) => v.voiceURI === voiceURI) ?? null : null;
        sentences.forEach((sentence, i) => {
          const u = new Utterance!(sentence);
          u.rate = rate;
          if (voice) {
            u.voice = voice;
            u.lang = voice.lang;
          } else {
            u.lang = "en-US";
          }
          u.onstart = () => token === current && onSentence?.(i);
          if (i === sentences.length - 1) u.onend = () => done("ended");
          u.onerror = (e) => {
            // "interrupted" and "canceled" are what cancel() produces; anything else is a real error.
            const err = (e as SpeechSynthesisErrorEvent).error;
            done(err === "interrupted" || err === "canceled" ? "cancelled" : "error");
          };
          synth!.speak(u);
        });
        if (sentences.length === 0) done("ended");
      });
    },

    cancel: stopAll,

    voices() {
      return supported ? synth!.getVoices() : [];
    },

    onVoicesChanged(cb) {
      if (!supported || !synth!.addEventListener) return () => {};
      synth!.addEventListener("voiceschanged", cb);
      return () => synth!.removeEventListener?.("voiceschanged", cb);
    },
  };
}
