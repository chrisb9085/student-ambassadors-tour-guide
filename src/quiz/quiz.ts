import type { Stop } from "../content/types";
import { metresBetween } from "../stops/describe";

/** One question: which building is highlighted on the map? */
export type Question = {
  stop: Stop;
  /** Four names to pick from, the answer among them, in random order. */
  choices: Stop[];
};

/** Questions per round: long enough to be useful, short enough to finish in a few minutes. */
export const ROUND_SIZE = 10;
export const CHOICES = 4;

/** Fisher-Yates shuffle into a new array. `rand` returns [0, 1) like Math.random. */
export function shuffle<T>(items: readonly T[], rand: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The answer plus its nearest neighbours as the wrong choices. Neighbours are the buildings an ambassador
 * is most likely to mix up from the road, so the quiz trains telling them apart.
 */
export function choicesFor(stop: Stop, pool: readonly Stop[], rand: () => number = Math.random, n = CHOICES): Stop[] {
  const others = pool
    .filter((s) => s.id !== stop.id)
    .map((s) => ({ s, d: metresBetween(stop.coordinates, s.coordinates) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n - 1)
    .map(({ s }) => s);
  return shuffle([stop, ...others], rand);
}

/** A round of distinct, randomly chosen buildings from `pool`. */
export function makeRound(pool: readonly Stop[], rand: () => number = Math.random, size = ROUND_SIZE): Question[] {
  return shuffle(pool, rand)
    .slice(0, Math.min(size, pool.length))
    .map((stop) => ({ stop, choices: choicesFor(stop, pool, rand) }));
}

/** "7 of 10 correct" plus a short, encouraging line. */
export function scoreLine(correct: number, total: number): { score: string; note: string } {
  const score = `${correct} of ${total} correct`;
  if (correct === total) return { score, note: "Perfect round. You know this campus." };
  if (correct >= total * 0.7) return { score, note: "Nice work. Review the ones you missed below." };
  return { score, note: "Keep going. Each round mixes in different buildings." };
}
