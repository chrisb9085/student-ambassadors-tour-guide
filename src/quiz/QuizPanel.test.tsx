import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "../App";
import { FakeMap } from "../test/mapboxMock";
import { FakeSpeaker } from "../test/fakeSpeaker";
import { allStops } from "../content";

const realMatchMedia = window.matchMedia;
beforeEach(() => {
  window.matchMedia = ((q: string) => ({
    matches: q.includes("prefers-reduced-motion"),
    media: q,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => {
  window.matchMedia = realMatchMedia;
});

async function openQuiz() {
  const user = userEvent.setup();
  render(<App token="pk.fake-test-value" speaker={new FakeSpeaker()} />);
  act(() => FakeMap.last.emit("load"));
  await user.click(screen.getByRole("button", { name: "Start tour" }));
  await user.click(screen.getByRole("button", { name: /quiz yourself/i }));
  return { user, map: FakeMap.last, quiz: () => screen.getByRole("dialog") };
}

const highlighted = (map: FakeMap) => map.container.querySelector<HTMLElement>(".stop-marker.is-selected")!.dataset.stopId!;
const nameOf = (id: string) => allStops.find((s) => s.id === id)!.name;

describe("Self-quiz", () => {
  it("opens from Start tour, highlights a building and hides marker names", async () => {
    const { map, quiz } = await openQuiz();
    expect(quiz()).toHaveTextContent("Which building is highlighted on the map?");
    expect(quiz()).toHaveTextContent(/question 1 of 10/i);
    expect(map.container.dataset.quiz).toBe("on");
    expect(highlighted(map)).toBeTruthy();
    expect(map.easeTo).toHaveBeenCalled();
    // The usual map actions step aside.
    expect(screen.queryByRole("button", { name: "Stops" })).toBeNull();
  });

  it("a right answer says so and reveals the card's key facts", async () => {
    const { user, map, quiz } = await openQuiz();
    const id = highlighted(map);
    const stop = allStops.find((s) => s.id === id)!;
    await user.click(within(quiz()).getByRole("button", { name: new RegExp(`^${escape(stop.name)}`) }));
    expect(screen.getByRole("status")).toHaveTextContent("Correct!");
    expect(quiz()).toHaveTextContent(stop.summary);
    expect(quiz()).toHaveTextContent(/1 correct/);
    // Choices lock once answered.
    for (const b of within(screen.getByRole("list", { name: "Choices" })).getAllByRole("button")) expect(b).toBeDisabled();
  });

  it("a wrong answer names the right building and marks both choices in text, not only color", async () => {
    const { user, map, quiz } = await openQuiz();
    const id = highlighted(map);
    const choices = within(screen.getByRole("list", { name: "Choices" })).getAllByRole("button");
    const wrong = choices.find((b) => !b.textContent!.startsWith(nameOf(id)))!;
    await user.click(wrong);
    expect(screen.getByRole("status")).toHaveTextContent(`Not quite. This is ${nameOf(id)}.`);
    expect(quiz()).toHaveTextContent("Your pick");
    expect(quiz()).toHaveTextContent("Answer");
    expect(quiz()).toHaveTextContent(/0 correct/);
  });

  it("runs ten questions, then shows the score and the buildings to review", async () => {
    const { user, map, quiz } = await openQuiz();
    for (let i = 0; i < 10; i++) {
      const choices = within(screen.getByRole("list", { name: "Choices" })).getAllByRole("button");
      // Answer the first five right and the rest wrong.
      const id = highlighted(map);
      const pick = choices.find((b) => b.textContent!.startsWith(nameOf(id)) === i < 5)!;
      await user.click(pick);
      await user.click(screen.getByRole("button", { name: i < 9 ? "Next question" : "See results" }));
    }
    expect(quiz()).toHaveTextContent("5 of 10 correct");
    expect(within(quiz()).getAllByRole("listitem")).toHaveLength(5);
    expect(map.container.querySelector(".stop-marker.is-selected")).toBeNull();
    // A missed building opens its full card.
    const first = within(quiz()).getAllByRole("listitem")[0];
    await user.click(within(first).getByRole("button"));
    expect(map.container.dataset.quiz).toBeUndefined();
    expect(screen.getByRole("dialog")).toHaveClass("info-card");
  });

  it("Escape or the close button leaves the quiz and returns focus to Start tour", async () => {
    const { user, map } = await openQuiz();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(map.container.dataset.quiz).toBeUndefined();
    expect(screen.getByRole("button", { name: "Start tour" })).toHaveFocus();
  });
});

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
