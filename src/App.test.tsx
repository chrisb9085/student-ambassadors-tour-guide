import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("shows a clear message instead of the map when no token is set", () => {
    render(<App token={null} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/campus map can't load/i);
    expect(screen.queryByRole("main")).not.toBeInTheDocument();
  });

  it("renders the map area when a token is set", () => {
    render(<App token="pk.fake-test-value" />);
    expect(screen.getByRole("main", { name: /campus tour map/i })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
