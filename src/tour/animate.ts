import { prefersReducedMotion } from "../map/camera";

/** Simulated driving speed for the vehicle animation (m/s, sped up), and the duration limits. */
export const DRIVE_SPEED = 90;
export const MIN_DRIVE_MS = 1200;
export const MAX_DRIVE_MS = 6000;

export function driveDuration(metres: number): number {
  if (metres <= 0) return 0;
  return Math.min(MAX_DRIVE_MS, Math.max(MIN_DRIVE_MS, (metres / DRIVE_SPEED) * 1000));
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * Animates a distance from `from` to `to`, calling onFrame with the current value.
 * Resolves true when it arrives, false if aborted. Jumps straight there with reduced motion or no animation frames.
 */
export function animateDistance(from: number, to: number, onFrame: (d: number) => void, signal: AbortSignal): Promise<boolean> {
  const duration = driveDuration(Math.abs(to - from));
  if (signal.aborted) return Promise.resolve(false);
  if (duration === 0 || prefersReducedMotion() || typeof requestAnimationFrame !== "function") {
    onFrame(to);
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      if (signal.aborted) return resolve(false);
      const t = Math.min(1, (now - start) / duration);
      onFrame(from + (to - from) * easeInOut(t));
      if (t < 1) raf = requestAnimationFrame(tick);
      else resolve(true);
    };
    signal.addEventListener("abort", () => {
      cancelAnimationFrame(raf);
      resolve(false);
    });
    raf = requestAnimationFrame(tick);
  });
}
