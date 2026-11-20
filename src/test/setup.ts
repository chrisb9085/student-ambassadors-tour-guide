import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { FakeMap, mapboxMock } from "./mapboxMock";

// jsdom has no WebGL: every test gets the fake map.
vi.mock("mapbox-gl", () => ({ default: mapboxMock, ...mapboxMock }));

afterEach(() => {
  cleanup();
  FakeMap.reset();
});
