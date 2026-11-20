import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { FakeMap } from "./test/mapboxMock";
import { INITIAL_VIEW } from "./map/campus";
import { routeBounds } from "./content";

describe("App", () => {
  it("shows a clear message instead of the map when no token is set", () => {
    render(<App token={null} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/campus map can't load/i);
    expect(screen.queryByRole("main")).not.toBeInTheDocument();
    expect(FakeMap.instances).toHaveLength(0);
  });

  it("renders the map when a token is set", () => {
    render(<App token="pk.fake-test-value" />);
    expect(screen.getByRole("main", { name: /campus tour map/i })).toBeInTheDocument();
    expect(FakeMap.instances).toHaveLength(1);
  });

  it("keeps the camera buttons disabled until the map has loaded", () => {
    render(<App token="pk.fake-test-value" />);
    expect(screen.getByRole("button", { name: /reset view/i })).toBeDisabled();
    act(() => FakeMap.last.emit("load"));
    expect(screen.getByRole("button", { name: /reset view/i })).toBeEnabled();
  });

  it("Reset view returns to the opening view and Whole route fits the route", async () => {
    const user = userEvent.setup();
    render(<App token="pk.fake-test-value" />);
    act(() => FakeMap.last.emit("load"));

    await user.click(screen.getByRole("button", { name: /reset view/i }));
    expect(FakeMap.last.easeTo).toHaveBeenCalledWith(expect.objectContaining({ center: INITIAL_VIEW.center, zoom: INITIAL_VIEW.zoom }));

    await user.click(screen.getByRole("button", { name: /whole route/i }));
    expect(FakeMap.last.fitBounds).toHaveBeenCalledWith(routeBounds, expect.objectContaining({ bearing: 0 }));
  });

  it("draws the route once the map has loaded", () => {
    render(<App token="pk.fake-test-value" />);
    expect(FakeMap.last.layers.size).toBe(0);
    act(() => FakeMap.last.emit("load"));
    expect(FakeMap.last.getLayer("tour-route-line")).toBeDefined();
  });

  it("reaches the camera buttons by keyboard", async () => {
    const user = userEvent.setup();
    render(<App token="pk.fake-test-value" />);
    act(() => FakeMap.last.emit("load"));
    await user.tab();
    expect(screen.getByRole("button", { name: /whole route/i })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: /reset view/i })).toHaveFocus();
  });

  it("puts the main actions before the 33 stop markers in Tab order", async () => {
    const user = userEvent.setup();
    render(<App token="pk.fake-test-value" />);
    act(() => FakeMap.last.emit("load"));
    for (let i = 0; i < 3; i++) await user.tab();
    expect(screen.getByRole("button", { name: "Stops" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Start tour" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: /stop 1 of 32/i })).toHaveFocus();
  });
});
