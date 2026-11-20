import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl, { type Map as MapboxMap } from "mapbox-gl";
import type { Speaker } from "./speech";
import type { TourStep } from "./steps";
import { pointAt, type MeasuredRoute } from "./routeMath";
import { animateDistance } from "./animate";
import type { TourSettings } from "./settings";

export type TourMode = "virtual" | "ride-along";
/** driving: vehicle moving; speaking: narration playing; waiting: done at this step; paused; finished: Closing done. */
export type TourPhase = "driving" | "speaking" | "waiting" | "paused" | "finished";

export type TourState = {
  active: boolean;
  mode: TourMode;
  index: number;
  playing: boolean;
  autoAdvance: boolean;
  phase: TourPhase;
  /** Sentence of the narration being spoken, for caption highlighting. -1 when none. */
  sentence: number;
  skipped: string[];
};

const IDLE: TourState = {
  active: false,
  mode: "virtual",
  index: 0,
  playing: false,
  autoAdvance: true,
  phase: "paused",
  sentence: -1,
  skipped: [],
};

/** Pause after narration before auto-advancing, so the guest can glance at the card. */
export const AUTO_ADVANCE_DELAY_MS = 1500;
export const TOUR_ZOOM = 16.6;

type Options = {
  map: MapboxMap | null;
  steps: TourStep[];
  measured: MeasuredRoute;
  speaker: Speaker;
  settings: Pick<TourSettings, "rate" | "voiceURI">;
  /** Screen padding so the vehicle stays visible beside the card. */
  padding: { top: number; bottom: number; left: number; right: number };
};

const NO_PADDING = { top: 0, bottom: 0, left: 0, right: 0 };

/** Move to a step: playing tours start driving there, paused tours just park there. */
const enter = (s: TourState, index: number): TourState => ({ ...s, index, sentence: -1, phase: s.playing ? "driving" : "paused" });

export function useTour({ map, steps, measured, speaker, settings, padding }: Options) {
  const [state, setState] = useState<TourState>(IDLE);
  const last = steps.length - 1;
  const distRef = useRef(0);
  const vehicleRef = useRef<mapboxgl.Marker | null>(null);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // --- Actions -------------------------------------------------------------------------------

  const start = useCallback(
    (mode: TourMode) => {
      speaker.unlock(); // must run inside the tap for iOS Safari
      distRef.current = 0;
      setState({ ...IDLE, active: true, mode, playing: true, autoAdvance: mode === "virtual", phase: "driving" });
    },
    [speaker],
  );

  const exit = useCallback(() => {
    speaker.cancel();
    setState(IDLE);
  }, [speaker]);

  const goTo = useCallback(
    (index: number) => setState((s) => (s.active && index >= 0 ? enter(s, Math.min(last, index)) : s)),
    [last],
  );
  const next = useCallback(() => setState((s) => (s.active && s.index < last ? enter(s, s.index + 1) : s)), [last]);
  const prev = useCallback(() => setState((s) => (s.active && s.index > 0 ? enter(s, s.index - 1) : s)), []);
  const skip = useCallback(
    () =>
      setState((s) =>
        s.active && s.index < last ? enter({ ...s, skipped: [...s.skipped, steps[s.index].id] }, s.index + 1) : s,
      ),
    [last, steps],
  );
  const goToStop = useCallback((id: string) => goTo(steps.findIndex((s) => s.id === id)), [goTo, steps]);

  const togglePlay = useCallback(() => {
    if (!state.playing) speaker.unlock(); // resuming is a tap too
    setState((s) => ({ ...s, playing: !s.playing, sentence: -1, phase: s.playing ? "paused" : "driving" }));
  }, [speaker, state.playing]);

  const setAutoAdvance = useCallback((on: boolean) => setState((s) => ({ ...s, autoAdvance: on })), []);

  // --- Vehicle marker and camera padding while the tour runs -----------------------------------

  useEffect(() => {
    if (!map || !state.active) return;
    const el = document.createElement("div");
    el.className = "vehicle-marker";
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", "Tour vehicle");
    el.innerHTML =
      '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11v6a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H8v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-6Zm2.2-.5h9.6l-1-3.2a.5.5 0 0 0-.5-.3H8.7a.5.5 0 0 0-.5.3l-1 3.2ZM7.5 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/></svg>';
    const marker = new mapboxgl.Marker({ element: el }).setLngLat(pointAt(measured, distRef.current)).addTo(map);
    vehicleRef.current = marker;
    return () => {
      marker.remove();
      vehicleRef.current = null;
    };
  }, [map, state.active, measured]);

  useEffect(() => {
    if (!map || !state.active) return;
    map.setPadding(padding);
    return () => {
      map.setPadding(NO_PADDING);
    };
  }, [map, state.active, padding]);

  // --- The step runner: drive, then narrate, then wait ------------------------------------------

  useEffect(() => {
    if (!state.active) return;
    const step = steps[state.index];
    const ctrl = new AbortController();
    const moveTo = (d: number) => {
      distRef.current = d;
      const at = pointAt(measured, d);
      vehicleRef.current?.setLngLat(at);
      map?.jumpTo({ center: at });
    };

    if (!state.playing) {
      // Paused: park at the step so its card and building are in view, but say nothing.
      speaker.cancel();
      if (Math.abs(distRef.current - step.distance) > 1) moveTo(step.distance);
      return () => ctrl.abort();
    }

    (async () => {
      // Phase is already "driving": every action that lands here sets it.
      if (map && map.getZoom() < TOUR_ZOOM - 0.5) map.jumpTo({ zoom: TOUR_ZOOM });
      // Going back jumps instead of driving in reverse.
      if (step.distance < distRef.current) moveTo(step.distance);
      else if (!(await animateDistance(distRef.current, step.distance, moveTo, ctrl.signal))) return;

      setState((s) => ({ ...s, phase: "speaking" }));
      const { rate, voiceURI } = settingsRef.current;
      const result = await speaker.speak(step.narration, {
        rate,
        voiceURI,
        clipId: step.id,
        onSentence: (i) => !ctrl.signal.aborted && setState((s) => ({ ...s, sentence: i })),
      });
      if (ctrl.signal.aborted || result === "cancelled") return;
      setState((s) => ({ ...s, phase: s.index === last ? "finished" : "waiting", sentence: -1 }));
    })();

    return () => {
      ctrl.abort();
      speaker.cancel();
    };
    // Settings are read through a ref so changing speed doesn't restart the current stop.
  }, [state.active, state.index, state.playing, steps, measured, map, speaker, last]);

  // Auto-advance after narration (virtual tour, or when switched on mid-tour).
  useEffect(() => {
    if (!state.active || !state.playing || !state.autoAdvance || state.phase !== "waiting") return;
    const t = setTimeout(next, AUTO_ADVANCE_DELAY_MS);
    return () => clearTimeout(t);
  }, [state.active, state.playing, state.autoAdvance, state.phase, next]);

  const step = state.active ? steps[state.index] : null;

  return useMemo(
    () => ({ state, step, last, start, exit, next, prev, skip, goTo, goToStop, togglePlay, setAutoAdvance }),
    [state, step, last, start, exit, next, prev, skip, goTo, goToStop, togglePlay, setAutoAdvance],
  );
}
