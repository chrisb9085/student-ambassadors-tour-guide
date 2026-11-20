import { useEffect } from "react";

/**
 * Keeps the screen on while a tour runs (Screen Wake Lock API), so a virtual tour isn't interrupted by the
 * screen dimming. The browser drops the lock when the page is hidden, so it's taken again when the page
 * comes back. Unsupported browsers just keep their normal screen timeout.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    const api = typeof navigator !== "undefined" ? navigator.wakeLock : undefined;
    if (!active || !api) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== "visible" || (lock && !lock.released)) return;
      try {
        const l = await api.request("screen");
        if (cancelled) void l.release();
        else lock = l;
      } catch {
        // Denied (battery saver, not allowed in this context): not fatal.
      }
    };
    const onVisible = () => void acquire();

    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
      lock = null;
    };
  }, [active]);
}
