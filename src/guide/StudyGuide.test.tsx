import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StudyGuide } from "./StudyGuide";
import { allStops, alsoOnCampus, routeStops, tour } from "../content";
import { STUDY_GUIDE_SEARCH, viewFor } from "../lib/view";

describe("study guide (Sprint 10)", () => {
  it("is opened by ?view=study-guide; everything else is the map", () => {
    expect(viewFor(STUDY_GUIDE_SEARCH)).toBe("study-guide");
    expect(viewFor("?stop=graham-center")).toBe("map");
    expect(viewFor("")).toBe("map");
  });

  it("lists Welcome, all 32 route stops in driving order, the also-on-campus stops, then Closing", () => {
    render(<StudyGuide />);
    expect(screen.getByRole("heading", { level: 1, name: "Study guide" })).toBeInTheDocument();
    const stops = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(stops[0]).toBe(tour.welcome.title);
    expect(stops.slice(1, 33)).toEqual(routeStops.map((s) => `Stop ${s.order}: ${s.name}`));
    expect(stops.slice(33, -1)).toEqual(alsoOnCampus.map((s) => s.name));
    expect(stops[stops.length - 1]).toBe(tour.closing.title);
    expect(document.title).toBe("Study guide · FIU Campus Tour");
  });

  it("gives each stop what to say, key facts, tour guide tips and sources", () => {
    render(<StudyGuide />);
    const sasc = screen.getByRole("article", { name: /student academic success center/i });
    expect(within(sasc).getByRole("heading", { name: "What to say" })).toBeInTheDocument();
    expect(sasc).toHaveTextContent(routeStops[0].narration!);
    expect(sasc).toHaveTextContent("Key facts");
    expect(sasc).toHaveTextContent("Tour guide tip");
    expect(sasc).toHaveTextContent("Handbook p.10");
    expect(within(sasc).getByRole("link", { name: /show on map/i })).toHaveAttribute("href", "/?stop=student-academic-success-center");
  });

  it("never shows the Foundation's review notes", () => {
    const { container } = render(<StudyGuide />);
    const notes = [...allStops, tour.welcome, tour.closing].flatMap((s) => s.reviewNotes ?? []);
    expect(notes.length).toBeGreaterThan(0);
    for (const n of notes) expect(container.textContent).not.toContain(n);
  });

  it("has a Print button and a way back to the map", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<StudyGuide />);
    await userEvent.click(screen.getByRole("button", { name: "Print" }));
    expect(print).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Back to the map" })).toHaveAttribute("href", "/");
    print.mockRestore();
  });
});
