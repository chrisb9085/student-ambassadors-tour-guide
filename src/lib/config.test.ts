import { describe, expect, it } from "vitest";
import { getMapboxToken } from "./config";

// Fake values only. Real tokens never go in tests.
describe("getMapboxToken", () => {
  it("returns null when the variable is missing or blank", () => {
    expect(getMapboxToken({})).toBeNull();
    expect(getMapboxToken({ VITE_MAPBOX_TOKEN: "   " })).toBeNull();
  });

  it("rejects secret or malformed tokens", () => {
    expect(getMapboxToken({ VITE_MAPBOX_TOKEN: "sk.fake" })).toBeNull();
    expect(getMapboxToken({ VITE_MAPBOX_TOKEN: "not-a-token" })).toBeNull();
  });

  it("returns a trimmed public token", () => {
    expect(getMapboxToken({ VITE_MAPBOX_TOKEN: " pk.fake-test-value " })).toBe("pk.fake-test-value");
  });
});
