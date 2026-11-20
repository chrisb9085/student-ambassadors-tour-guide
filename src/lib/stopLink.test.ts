import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText, stopIdFromSearch, urlWithStop } from "./stopLink";

const IDS = ["graham-center", "bell-chapel"];

describe("shareable stop links", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads a known stop id from the query string and ignores unknown ones", () => {
    expect(stopIdFromSearch("?stop=graham-center", IDS)).toBe("graham-center");
    expect(stopIdFromSearch("?utm=x&stop=bell-chapel", IDS)).toBe("bell-chapel");
    expect(stopIdFromSearch("?stop=not-a-stop", IDS)).toBeNull();
    expect(stopIdFromSearch("", IDS)).toBeNull();
  });

  it("sets or removes ?stop= and keeps everything else", () => {
    expect(urlWithStop("https://tour.example/?utm=x#map", "graham-center")).toBe("https://tour.example/?utm=x&stop=graham-center#map");
    expect(urlWithStop("https://tour.example/?stop=graham-center&utm=x", null)).toBe("https://tour.example/?utm=x");
    expect(urlWithStop("https://tour.example/?stop=a", "bell-chapel")).toBe("https://tour.example/?stop=bell-chapel");
  });

  it("copies with the clipboard API, and reports false when it's missing or refused", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await expect(copyText("hello")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    await expect(copyText("hello")).resolves.toBe(false);
    vi.stubGlobal("navigator", {});
    await expect(copyText("hello")).resolves.toBe(false);
  });
});
