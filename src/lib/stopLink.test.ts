import { describe, expect, it } from "vitest";
import { stopIdFromSearch, urlWithStop } from "./stopLink";

const IDS = ["graham-center", "bell-chapel"];

describe("shareable stop links", () => {
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
});
