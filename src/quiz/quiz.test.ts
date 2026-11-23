import { describe, expect, it } from "vitest";
import { allStops } from "../content";
import { metresBetween } from "../stops/describe";
import { choicesFor, CHOICES, makeRound, ROUND_SIZE, scoreLine, shuffle } from "./quiz";

/** Small seeded generator (mulberry32) so rounds are repeatable in tests. */
export function seeded(seed = 1) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("self-quiz logic", () => {
  it("shuffle keeps every item and doesn't change the input", () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = shuffle(input, seeded(3));
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("a round has ten distinct buildings", () => {
    const round = makeRound(allStops, seeded(7));
    expect(round).toHaveLength(ROUND_SIZE);
    expect(new Set(round.map((q) => q.stop.id)).size).toBe(ROUND_SIZE);
  });

  it("each question has four distinct choices, including the answer", () => {
    for (const q of makeRound(allStops, seeded(11), allStops.length)) {
      expect(q.choices).toHaveLength(CHOICES);
      expect(new Set(q.choices.map((c) => c.id)).size).toBe(CHOICES);
      expect(q.choices.map((c) => c.id)).toContain(q.stop.id);
    }
  });

  it("wrong choices are the answer's nearest neighbours, the buildings easiest to mix up", () => {
    const stop = allStops.find((s) => s.id === "graham-center")!;
    const wrong = choicesFor(stop, allStops, seeded(5)).filter((c) => c.id !== stop.id);
    const farthestWrong = Math.max(...wrong.map((c) => metresBetween(stop.coordinates, c.coordinates)));
    const others = allStops.filter((s) => s.id !== stop.id && !wrong.includes(s));
    for (const o of others) expect(metresBetween(stop.coordinates, o.coordinates)).toBeGreaterThanOrEqual(farthestWrong);
  });

  it("scores the round", () => {
    expect(scoreLine(10, 10)).toEqual({ score: "10 of 10 correct", note: expect.stringMatching(/perfect/i) });
    expect(scoreLine(7, 10).note).toMatch(/review/i);
    expect(scoreLine(2, 10).note).toMatch(/keep going/i);
  });
});
