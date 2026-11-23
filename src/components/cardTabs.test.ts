import { describe, expect, it } from "vitest";
import { speakingTime } from "./cardTabs";

const words = (n: number) => Array.from({ length: n }, () => "word").join(" ");

describe("speakingTime", () => {
  it("rounds to 5 seconds at about 150 words a minute", () => {
    expect(speakingTime(words(85))).toBe("About 35 seconds");
    expect(speakingTime(words(2))).toBe("About 5 seconds");
  });

  it("switches to minutes from a minute up", () => {
    expect(speakingTime(words(150))).toBe("About 1 min");
    expect(speakingTime(words(175))).toBe("About 1 min 10 sec");
  });
});
