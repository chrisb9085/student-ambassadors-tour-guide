import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "../App";
import { FakeMap, FakeMarker } from "../test/mapboxMock";
import { FakeSpeaker } from "../test/fakeSpeaker";
import { routeStops, tour } from "../content";
import { AUTO_ADVANCE_DELAY_MS } from "./useTour";

// Reduced motion makes the vehicle jump instead of animating, so tests don't wait on animation frames.
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
  localStorage.clear();
});

async function startTour(mode: "Virtual tour" | "Ride-along") {
  const user = userEvent.setup();
  const speaker = new FakeSpeaker();
  render(<App token="pk.fake-test-value" speaker={speaker} />);
  act(() => FakeMap.last.emit("load"));
  await user.click(screen.getByRole("button", { name: "Start tour" }));
  await user.click(screen.getByRole("button", { name: new RegExp(mode, "i") }));
  // Let the drive (instant under reduced motion) finish and narration begin.
  await waitFor(() => expect(speaker.speaking).toBe(true));
  return { user, speaker, map: FakeMap.last };
}

const progress = () => screen.getByRole("region", { name: "Tour controls" });
const tourCard = () => document.querySelector<HTMLElement>(".info-card")!;

describe("Tour Mode (S4.1-S4.5)", () => {
  it("Start tour asks for a mode; choosing one unlocks speech in the same tap and plays Welcome", async () => {
    const { speaker } = await startTour("Virtual tour");
    expect(speaker.unlocks).toBeGreaterThanOrEqual(1);
    expect(speaker.lastText).toBe(tour.welcome.narration);
    expect(progress()).toHaveTextContent("Welcome");
    expect(progress()).toHaveTextContent("Virtual tour");
    // Captions: the spoken words are visible on the card.
    expect(tourCard()).toHaveTextContent("Now speaking");
    expect(tourCard()).toHaveTextContent(/thank you for joining us/i);
    // Normal map UI steps aside.
    expect(screen.queryByRole("button", { name: "Stops" })).toBeNull();
    expect(screen.queryByRole("button", { name: /whole route/i })).toBeNull();
  });

  it("shows the vehicle and pads the camera so it stays beside the card", async () => {
    const { map } = await startTour("Virtual tour");
    expect(map.container.querySelector(".vehicle-marker")).not.toBeNull();
    expect(map.setPadding).toHaveBeenCalled();
    expect(map.jumpTo).toHaveBeenCalled();
  });

  it("virtual tour auto-advances to stop 1 after narration ends", async () => {
    const { speaker } = await startTour("Virtual tour");
    act(() => speaker.finish());
    await waitFor(() => expect(progress()).toHaveTextContent("Stop 1 of 32"), { timeout: AUTO_ADVANCE_DELAY_MS + 1500 });
    await waitFor(() => expect(speaker.lastText).toBe(routeStops[0].narration));
    // The stop's marker is highlighted.
    expect(screen.getByRole("button", { name: /stop 1 of 32/i })).toHaveAttribute("aria-current", "true");
  });

  it("ride-along waits for Next after narration", async () => {
    const { user, speaker } = await startTour("Ride-along");
    act(() => speaker.finish());
    await new Promise((r) => setTimeout(r, AUTO_ADVANCE_DELAY_MS + 200));
    expect(progress()).toHaveTextContent("Welcome");
    await user.click(screen.getByRole("button", { name: "Next stop" }));
    expect(progress()).toHaveTextContent("Stop 1 of 32");
    await waitFor(() => expect(speaker.lastText).toBe(routeStops[0].narration));
  });

  it("Next during narration cuts it off and moves on; Previous goes back", async () => {
    const { user, speaker } = await startTour("Ride-along");
    await user.click(screen.getByRole("button", { name: "Next stop" }));
    await user.click(screen.getByRole("button", { name: "Next stop" }));
    expect(progress()).toHaveTextContent("Stop 2 of 32");
    await user.click(screen.getByRole("button", { name: "Previous stop" }));
    expect(progress()).toHaveTextContent("Stop 1 of 32");
    await waitFor(() => expect(speaker.lastText).toBe(routeStops[0].narration));
  });

  it("Skip this stop moves past it and counts it", async () => {
    const { user } = await startTour("Ride-along");
    await user.click(screen.getByRole("button", { name: "Next stop" }));
    await user.click(screen.getByRole("button", { name: "Skip this stop" }));
    expect(progress()).toHaveTextContent("Stop 2 of 32");
    expect(progress()).toHaveTextContent("1 skipped");
  });

  it("quick-pass stops play their short mention; under-construction stops keep the badge", async () => {
    const { user, speaker } = await startTour("Ride-along");
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole("button", { name: "Next stop" }));
    expect(progress()).toHaveTextContent("Stop 3 of 32");
    await waitFor(() => expect(speaker.lastText).toBe(routeStops[2].narration));
    expect(routeStops[2].narration!.split(/\s+/).length).toBeLessThanOrEqual(35);
    expect(tourCard()).toHaveTextContent("Under construction");
  });

  it("Pause stops narration; Play replays the stop from the start (and unlocks speech again)", async () => {
    const { user, speaker } = await startTour("Virtual tour");
    await user.click(screen.getByRole("button", { name: "Pause narration" }));
    expect(speaker.speaking).toBe(false);
    expect(tourCard()).toHaveTextContent("Narration");
    const unlocks = speaker.unlocks;
    const spoken = speaker.spoken.length;
    await user.click(screen.getByRole("button", { name: "Play narration" }));
    expect(speaker.unlocks).toBe(unlocks + 1);
    await waitFor(() => expect(speaker.spoken.length).toBe(spoken + 1));
    expect(speaker.lastText).toBe(tour.welcome.narration);
  });

  it("tapping a marker during the tour jumps to that stop", async () => {
    const { user } = await startTour("Ride-along");
    await user.click(screen.getByRole("button", { name: /29 pitbull stadium/i }));
    expect(progress()).toHaveTextContent("Stop 29 of 32");
    expect(tourCard()).toHaveTextContent("Pitbull Stadium");
  });

  it("ends with the Closing card, then offers Restart and Exit", async () => {
    const { user, speaker } = await startTour("Ride-along");
    // Jump to the last stop by its marker, then Next to Closing.
    await user.click(screen.getByRole("button", { name: /32 performing arts center/i }));
    expect(progress()).toHaveTextContent("Stop 32 of 32");
    await user.click(screen.getByRole("button", { name: "Next stop" }));
    expect(progress()).toHaveTextContent("Thank you");
    expect(screen.getByRole("button", { name: "Next stop" })).toBeDisabled();
    await waitFor(() => expect(speaker.lastText).toBe(tour.closing.narration));
    act(() => speaker.finish());
    await waitFor(() => expect(progress()).toHaveTextContent("Tour complete"));
    await user.click(screen.getByRole("button", { name: "Restart tour" }));
    expect(progress()).toHaveTextContent("Welcome");
  });

  it("Exit returns to the map, removes the vehicle and resets camera padding", async () => {
    const { user, speaker, map } = await startTour("Virtual tour");
    await user.click(screen.getByRole("button", { name: "Exit tour" }));
    expect(screen.queryByRole("region", { name: "Tour controls" })).toBeNull();
    expect(screen.getByRole("button", { name: "Start tour" })).toBeInTheDocument();
    expect(map.container.querySelector(".vehicle-marker")).toBeNull();
    expect(map.setPadding).toHaveBeenLastCalledWith({ top: 0, bottom: 0, left: 0, right: 0 });
    expect(speaker.speaking).toBe(false);
    expect(FakeMarker.instances.some((m) => m.element.classList.contains("vehicle-marker") && m.map)).toBe(false);
  });

  it("settings: auto-advance toggle, speech speed (saved) and the voice list", async () => {
    const { user, speaker } = await startTour("Virtual tour");
    await user.click(screen.getByRole("button", { name: "Tour settings" }));
    const panel = screen.getByRole("dialog", { name: "Tour settings" });
    const auto = within(panel).getByRole("switch", { name: /auto-advance/i });
    expect(auto).toBeChecked();
    await user.click(auto);
    expect(auto).not.toBeChecked();
    await user.click(within(panel).getByRole("radio", { name: "Faster" }));
    expect(JSON.parse(localStorage.getItem("fiu-tour-settings")!)).toMatchObject({ rate: 1.1 });
    expect(within(panel).getByRole("combobox", { name: /voice/i })).toHaveValue("");
    // The new speed applies to the next narration, without restarting the current one.
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Next stop" }));
    await waitFor(() => expect(speaker.spoken[speaker.spoken.length - 1].options.rate).toBe(1.1));
  });

  it("keyboard focus: the main control on start, Exit when finished, Start tour after exit", async () => {
    const virtual = await startTour("Virtual tour");
    expect(screen.getByRole("button", { name: "Pause narration" })).toHaveFocus();
    await virtual.user.click(screen.getByRole("button", { name: "Exit tour" }));
    expect(screen.getByRole("button", { name: "Start tour" })).toHaveFocus();
  });

  it("ride-along focuses Next; finishing moves focus to Exit", async () => {
    const { user, speaker } = await startTour("Ride-along");
    expect(screen.getByRole("button", { name: "Next stop" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(progress()).toHaveTextContent("Stop 1 of 32");
    await user.click(screen.getByRole("button", { name: /32 performing arts center/i }));
    await user.click(screen.getByRole("button", { name: "Next stop" }));
    expect(progress()).toHaveTextContent("Thank you");
    await waitFor(() => expect(speaker.lastText).toBe(tour.closing.narration));
    act(() => speaker.finish());
    await waitFor(() => expect(screen.getByRole("button", { name: "Exit tour" })).toHaveFocus());
  });

  it("every control is a large, labelled button", async () => {
    await startTour("Virtual tour");
    const names = within(progress())
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-label"));
    expect(names).toEqual(["Previous stop", "Pause narration", "Next stop", "Skip this stop", "Tour settings", "Exit tour"]);
    expect(screen.getByRole("progressbar", { name: /tour progress: welcome/i })).toBeInTheDocument();
  });
});
