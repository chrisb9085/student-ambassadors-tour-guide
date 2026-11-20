import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useWakeLock } from "./useWakeLock";

function fakeWakeLock() {
  const locks: { released: boolean; release: ReturnType<typeof vi.fn> }[] = [];
  const request = vi.fn(async () => {
    const l = { released: false, release: vi.fn(async () => void (l.released = true)) };
    locks.push(l);
    return l;
  });
  Object.defineProperty(navigator, "wakeLock", { value: { request }, configurable: true });
  return { request, locks };
}

describe("keep the screen on during a tour (Sprint 12)", () => {
  afterEach(() => {
    Object.defineProperty(navigator, "wakeLock", { value: undefined, configurable: true });
  });

  it("takes a screen wake lock while active and releases it when the tour ends", async () => {
    const { request, locks } = fakeWakeLock();
    const { rerender } = renderHook(({ on }) => useWakeLock(on), { initialProps: { on: false } });
    expect(request).not.toHaveBeenCalled();
    rerender({ on: true });
    await waitFor(() => expect(request).toHaveBeenCalledWith("screen"));
    rerender({ on: false });
    await waitFor(() => expect(locks[0].release).toHaveBeenCalled());
  });

  it("takes the lock again when the page becomes visible (browsers drop it when hidden)", async () => {
    const { request, locks } = fakeWakeLock();
    renderHook(() => useWakeLock(true));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    locks[0].released = true; // what the browser does when the tab is hidden
    document.dispatchEvent(new Event("visibilitychange"));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  });

  it("does nothing where the API isn't available", () => {
    expect(() => renderHook(() => useWakeLock(true))).not.toThrow();
  });
});
