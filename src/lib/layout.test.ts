import { describe, expect, it } from "vitest";
import { panelWidth, SIDE_PANEL_QUERY } from "./layout";

describe("layout (Sprint 12: phones in landscape)", () => {
  it("uses the side panel for landscape screens from 640 px wide", () => {
    expect(SIDE_PANEL_QUERY).toBe("(orientation: landscape) and (min-width: 640px)");
  });

  it("keeps the panel at 384 px on iPads and desktops, and 45% of the screen on phones", () => {
    expect(panelWidth(1366)).toBe(384);
    expect(panelWidth(1180)).toBe(384);
    expect(panelWidth(844)).toBe(380);
    expect(panelWidth(667)).toBe(300);
  });
});
