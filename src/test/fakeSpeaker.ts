import type { SpeakOptions, SpeakResult, Speaker } from "../tour/speech";

/** A speaker tests can drive: each speak() waits until the test calls finish() (or it's cancelled). */
export class FakeSpeaker implements Speaker {
  supported = true;
  unlocks = 0;
  spoken: { text: string; options: SpeakOptions }[] = [];
  private pending: ((r: SpeakResult) => void) | null = null;

  unlock() {
    this.unlocks++;
  }

  speak(text: string, options: SpeakOptions) {
    this.cancel();
    this.spoken.push({ text, options });
    options.onSentence?.(0);
    return new Promise<SpeakResult>((resolve) => (this.pending = resolve));
  }

  /** Finish the current narration as if the voice reached the end. */
  finish() {
    const p = this.pending;
    this.pending = null;
    p?.("ended");
  }

  cancel() {
    const p = this.pending;
    this.pending = null;
    p?.("cancelled");
  }

  get speaking() {
    return this.pending !== null;
  }

  get lastText() {
    return this.spoken[this.spoken.length - 1]?.text;
  }

  voices() {
    return [];
  }

  onVoicesChanged() {
    return () => {};
  }
}
