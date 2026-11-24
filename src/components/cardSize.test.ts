import { describe, expect, it } from "vitest";
import { snapSize, toggledSize } from "./cardSize";

const heights = { peek: 150, normal: 460, full: 820 };

describe("card sizes", () => {
  it("the Expand button switches between normal and full, and a peeking card expands", () => {
    expect(toggledSize("normal")).toBe("full");
    expect(toggledSize("full")).toBe("normal");
    expect(toggledSize("peek")).toBe("full");
  });

  it("a slow drag settles at the nearest size", () => {
    expect(snapSize(700, 0, heights)).toBe("full");
    expect(snapSize(500, 0.1, heights)).toBe("normal");
    expect(snapSize(250, -0.1, heights)).toBe("peek");
  });

  it("a quick swipe moves one size in its direction, however short", () => {
    expect(snapSize(480, -1, heights)).toBe("full");
    expect(snapSize(440, 1, heights)).toBe("peek");
    expect(snapSize(780, 1, heights)).toBe("normal");
    expect(snapSize(200, -1, heights)).toBe("normal");
  });

  it("stays at the ends", () => {
    expect(snapSize(820, -1, heights)).toBe("full");
    expect(snapSize(150, 1, heights)).toBe("peek");
  });
});
