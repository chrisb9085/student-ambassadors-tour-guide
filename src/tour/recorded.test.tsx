import { render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TourSettingsPanel, type TourSettingsPanelProps } from "./TourSettingsPanel";
import { useMediaSession } from "./useMediaSession";

const panelProps = (over: Partial<TourSettingsPanelProps> = {}): TourSettingsPanelProps => ({
  id: "settings",
  autoAdvance: true,
  onAutoAdvance: () => {},
  rate: 0.95,
  onRate: () => {},
  voices: [],
  voiceURI: null,
  onVoice: () => {},
  speechSupported: true,
  recordings: false,
  recorded: true,
  onRecorded: () => {},
  onClose: () => {},
  ...over,
});

describe("Narration voice setting (Sprint 11)", () => {
  it("is hidden when the site has no recordings", () => {
    render(<TourSettingsPanel {...panelProps()} />);
    expect(screen.queryByRole("group", { name: "Narration voice" })).toBeNull();
  });

  it("offers Recorded or This device when recordings exist", async () => {
    const onRecorded = vi.fn();
    render(<TourSettingsPanel {...panelProps({ recordings: true, onRecorded })} />);
    expect(screen.getByRole("group", { name: "Narration voice" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Recorded" })).toBeChecked();
    await userEvent.click(screen.getByRole("radio", { name: "This device" }));
    expect(onRecorded).toHaveBeenCalledWith(false);
    expect(screen.getByText(/used for any stop without a recording/i)).toBeInTheDocument();
  });
});

describe("lock-screen controls (Media Session)", () => {
  const handlers: Partial<Record<MediaSessionAction, (() => void) | null>> = {};
  const session = {
    metadata: null as unknown,
    playbackState: "none",
    setActionHandler: vi.fn((a: MediaSessionAction, h: (() => void) | null) => (handlers[a] = h)),
  };
  class Metadata {
    constructor(public init: MediaMetadataInit) {}
  }
  vi.stubGlobal("MediaMetadata", Metadata);
  Object.defineProperty(navigator, "mediaSession", { value: session, configurable: true });
  afterEach(() => vi.clearAllMocks());

  it("maps play, pause, next and previous to the tour, names the stop, and clears on exit", () => {
    const tour = { togglePlay: vi.fn(), next: vi.fn(), prev: vi.fn() };
    const { rerender, unmount } = renderHook((p: { active: boolean; playing: boolean }) =>
      useMediaSession({ ...p, title: "Ernest R. Graham Center", subtitle: "Stop 2 of 32", ...tour }),
      { initialProps: { active: true, playing: true } },
    );
    expect((session.metadata as Metadata).init).toEqual({ title: "Ernest R. Graham Center", artist: "FIU Campus Tour", album: "Stop 2 of 32" });
    expect(session.playbackState).toBe("playing");
    handlers.play!(); // already playing: nothing
    expect(tour.togglePlay).not.toHaveBeenCalled();
    handlers.pause!();
    expect(tour.togglePlay).toHaveBeenCalledTimes(1);
    handlers.nexttrack!();
    handlers.previoustrack!();
    expect(tour.next).toHaveBeenCalled();
    expect(tour.prev).toHaveBeenCalled();
    rerender({ active: true, playing: false });
    expect(session.playbackState).toBe("paused");
    handlers.play!();
    expect(tour.togglePlay).toHaveBeenCalledTimes(2);
    rerender({ active: false, playing: false });
    expect(handlers.nexttrack).toBeNull();
    expect(session.metadata).toBeNull();
    unmount();
  });
});
