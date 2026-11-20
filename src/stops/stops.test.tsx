import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../App";
import { FakeMap } from "../test/mapboxMock";
import { allStops } from "../content";

function renderLoaded() {
  const user = userEvent.setup();
  const utils = render(<App token="pk.fake-test-value" />);
  act(() => FakeMap.last.emit("load"));
  return { user, map: FakeMap.last, ...utils };
}

const marker = (name: RegExp) => screen.getByRole("button", { name });
const card = () => screen.getByRole("dialog");

describe("stop markers (S3.1)", () => {
  it("adds one marker button per stop, in route order, with Green Library last", () => {
    const { map } = renderLoaded();
    const buttons = [...map.container.querySelectorAll<HTMLButtonElement>(".stop-marker")];
    expect(buttons).toHaveLength(33);
    expect(buttons.slice(0, 3).map((b) => b.getAttribute("aria-label"))).toEqual([
      "1 Student Success Center, stop 1 of 32",
      "2 Graham Center, stop 2 of 32",
      "3 Bell Chapel, stop 3 of 32",
    ]);
    expect(buttons[32].dataset.stopId).toBe("green-library");
  });

  it("keeps the button role (Mapbox would otherwise make markers role=img)", () => {
    renderLoaded();
    expect(screen.getAllByRole("button", { name: /, stop \d+ of 32$/ })).toHaveLength(32);
    expect(screen.getByRole("button", { name: /green library/i })).toBeInTheDocument();
  });

  it("announces the full name, type and status as each marker's description", () => {
    renderLoaded();
    expect(screen.getByRole("button", { name: /3 bell chapel/i })).toHaveAccessibleDescription(
      "Trish and Dan Bell Chapel. Quick pass. Under construction.",
    );
    expect(screen.getByRole("button", { name: /1 student success center/i })).toHaveAccessibleDescription(
      "Student Academic Success Center. Featured.",
    );
  });

  it("styles quick-pass, under-construction and also-on-campus markers differently", () => {
    const { map } = renderLoaded();
    const el = (id: string) => map.container.querySelector(`[data-stop-id="${id}"]`)!;
    expect(el("graham-center")).toHaveClass("stop-marker--featured");
    expect(el("red-garage")).toHaveClass("stop-marker--quick-pass");
    expect(el("bell-chapel")).toHaveClass("stop-marker--construction");
    expect(el("bell-chapel").querySelector(".stop-marker-hat")).not.toBeNull();
    expect(el("green-library")).toHaveClass("stop-marker--also-on-campus");
  });

  it("sets the zoom band on the map container so labels appear as you zoom in", () => {
    const { map } = renderLoaded();
    expect(map.container.dataset.zoomBand).toBe("low");
    act(() => map.setZoomForTest(17.2));
    expect(map.container.dataset.zoomBand).toBe("high");
  });
});

describe("stop cards (S3.2)", () => {
  it("opens a card from a marker, centers the stop and marks the marker selected", async () => {
    const { user, map } = renderLoaded();
    await user.click(marker(/2 graham center, stop 2 of 32/i));
    expect(within(card()).getByRole("heading", { level: 2 })).toHaveTextContent("Graham Center");
    expect(card()).toHaveTextContent("Stop 2 of 32 · Featured");
    expect(card()).toHaveTextContent("3.5M+");
    expect(card()).toHaveTextContent("Impact of support");
    expect(map.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({ center: [-80.3727, 25.7563] }));
    expect(marker(/stop 2 of 32/i)).toHaveAttribute("aria-current", "true");
    // Focus moves to the card title for screen readers and keyboards.
    expect(within(card()).getByRole("heading", { level: 2 })).toHaveFocus();
  });

  it("moves along the route with Previous and Next", async () => {
    const { user } = renderLoaded();
    await user.click(marker(/stop 1 of 32/i));
    expect(screen.getByRole("button", { name: "Previous stop" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /next stop: graham center/i }));
    expect(card()).toHaveTextContent("Graham Center");
    await user.click(screen.getByRole("button", { name: /next stop: trish and dan bell chapel/i }));
    expect(card()).toHaveTextContent("Under construction");
    await user.click(screen.getByRole("button", { name: /previous stop: graham center/i }));
    expect(card()).toHaveTextContent("Stop 2 of 32");
  });

  it("disables Next on the last stop", async () => {
    const { user } = renderLoaded();
    await user.click(marker(/stop 32 of 32/i));
    expect(screen.getByRole("button", { name: "Next stop" })).toBeDisabled();
  });

  it("shows the under-construction badge with full information for Bell Chapel", async () => {
    const { user } = renderLoaded();
    await user.click(marker(/bell chapel/i));
    expect(card()).toHaveTextContent("Under construction");
    expect(card()).toHaveTextContent("multifaith");
    expect(within(card()).getAllByRole("listitem").length).toBeGreaterThan(0);
  });

  it("shows Green Library as off-route, without Previous and Next", async () => {
    const { user } = renderLoaded();
    await user.click(marker(/green library/i));
    expect(card()).toHaveTextContent("Also on campus · Not on the driving route");
    expect(screen.queryByRole("button", { name: /next stop/i })).toBeNull();
  });

  it("closes with Escape and returns focus to the marker", async () => {
    const { user } = renderLoaded();
    marker(/stop 2 of 32/i).focus();
    await user.keyboard("{Enter}");
    expect(card()).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(marker(/stop 2 of 32/i)).toHaveFocus();
  });

  it("opens a card when the map is tapped next to a building", () => {
    const { map } = renderLoaded();
    const frost = allStops.find((s) => s.id === "frost-art-museum")!;
    act(() =>
      map.emit("click", { lngLat: { lng: frost.coordinates[0] + 0.0003, lat: frost.coordinates[1] }, originalEvent: { target: map.container } }),
    );
    expect(card()).toHaveTextContent("Patricia and Phillip Frost Art Museum");
  });

  it("ignores taps on open ground", () => {
    const { map } = renderLoaded();
    act(() => map.emit("click", { lngLat: { lng: -80.383, lat: 25.749 }, originalEvent: { target: map.container } }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("never shows review notes to guests", async () => {
    const { user } = renderLoaded();
    await user.click(marker(/ziff/i));
    expect(card()).not.toHaveTextContent(/confirm|needs content/i);
  });
});

describe("stop list (S3.3)", () => {
  it("lists all 32 route stops in order plus Green Library", async () => {
    const { user } = renderLoaded();
    await user.click(screen.getByRole("button", { name: "Stops" }));
    const list = screen.getByRole("region", { name: "Tour stops" });
    const route = within(list).getByRole("list", { name: /driving route/i });
    const items = within(route).getAllByRole("button");
    expect(items).toHaveLength(32);
    expect(items[0]).toHaveTextContent("Student Academic Success Center");
    expect(items[31]).toHaveTextContent("Herbert and Nicole Wertheim Performing Arts Center");
    expect(within(list).getByRole("heading", { name: "Also on campus" })).toBeInTheDocument();
    expect(items[2]).toHaveTextContent("Under construction");
  });

  it("is keyboard navigable and opens the chosen stop's card", async () => {
    const { user } = renderLoaded();
    await user.click(screen.getByRole("button", { name: "Stops" }));
    const list = screen.getByRole("region", { name: "Tour stops" });
    expect(within(list).getByRole("button", { name: /student academic success center/i })).toHaveFocus();
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(document.activeElement).toHaveTextContent("Trish and Dan Bell Chapel");
    await user.keyboard("{End}");
    expect(document.activeElement).toHaveTextContent("Green Library");
    await user.keyboard("{Home}{ArrowDown}{Enter}");
    expect(screen.queryByRole("region", { name: "Tour stops" })).toBeNull();
    expect(card()).toHaveTextContent("Graham Center");
  });

  it("toggles with the Stops button, which reports its state", async () => {
    const { user } = renderLoaded();
    const btn = screen.getByRole("button", { name: "Stops" });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    await user.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("region", { name: "Tour stops" })).toBeNull();
  });
});
