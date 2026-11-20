import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import { getMapboxToken } from "./lib/config";
import { focusOffset, tourPadding, useSidePanelLayout } from "./lib/layout";
import { MissingToken } from "./components/MissingToken";
import { MapView } from "./map/MapView";
import { MapControls } from "./map/MapControls";
import { RouteLayer } from "./map/RouteLayer";
import { defaultCamera, focusStop, resetView, showWholeRoute } from "./map/camera";
import { allStops, alsoOnCampus, route, routeBounds, routeStops, tour } from "./content";
import { StopMarkers } from "./stops/StopMarkers";
import { StopCard } from "./stops/StopCard";
import { StopList } from "./stops/StopList";
import { neighbours } from "./stops/describe";
import { buildSteps } from "./tour/steps";
import { createSpeaker, pickDefaultVoice, type Speaker } from "./tour/speech";
import { loadSettings, saveSettings, type TourSettings } from "./tour/settings";
import { useTour, type TourMode } from "./tour/useTour";
import { StartTourSheet } from "./tour/StartTourSheet";
import { TourCard } from "./tour/TourCard";
import { TourControls } from "./tour/TourControls";
import "./App.css";

const STOP_LIST_ID = "stop-list";
const TOUR = buildSteps(tour, routeStops, route);

type Props = {
  token?: string | null;
  /** Tests pass a fake; the app uses the browser's speech engine. */
  speaker?: Speaker;
};

export function App({ token = getMapboxToken(), speaker: speakerProp }: Props) {
  const [map, setMap] = useState<MapboxMap | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const sidePanel = useSidePanelLayout();

  // Speech and tour settings.
  const speaker = useMemo(() => speakerProp ?? createSpeaker(), [speakerProp]);
  const [settings, setSettings] = useState<TourSettings>(loadSettings);
  const [voices, setVoices] = useState(() => speaker.voices());
  useEffect(() => speaker.onVoicesChanged(() => setVoices(speaker.voices())), [speaker]);
  const updateSettings = useCallback((patch: Partial<TourSettings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);
  const speechSettings = useMemo(
    () => ({ rate: settings.rate, voiceURI: settings.voiceURI ?? pickDefaultVoice(voices)?.voiceURI ?? null }),
    [settings, voices],
  );
  const padding = useMemo(() => tourPadding(sidePanel, typeof window !== "undefined" ? window.innerHeight : 800), [sidePanel]);
  const t = useTour({ map, steps: TOUR.steps, measured: TOUR.measured, speaker, settings: speechSettings, padding });
  const touring = t.state.active;

  // When the tour ends, its controls disappear: put keyboard focus back on Start tour instead of the page top.
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const wasTouring = useRef(false);
  useEffect(() => {
    if (wasTouring.current && !touring) startButtonRef.current?.focus();
    wasTouring.current = touring;
  }, [touring]);

  // Phones: open on a view that fits the whole route, not the iPad-sized default.
  useEffect(() => {
    if (map) map.jumpTo(defaultCamera(map, routeBounds));
  }, [map]);

  useEffect(() => {
    // Dev builds only: lets Playwright tests and the coordinate survey drive the live map.
    if (import.meta.env.DEV) (window as unknown as { __tourMap?: MapboxMap | null }).__tourMap = map;
  }, [map]);

  const selectStop = useCallback(
    (id: string) => {
      setSelectedId(id);
      setListOpen(false);
      const stop = allStops.find((s) => s.id === id);
      if (map && stop) focusStop(map, stop.coordinates, focusOffset(sidePanel));
    },
    [map, sidePanel],
  );

  const startTour = useCallback(
    (mode: TourMode) => {
      setChooserOpen(false);
      setSelectedId(null);
      setListOpen(false);
      t.start(mode);
    },
    [t],
  );

  if (!token) return <MissingToken />;

  const selected = touring ? null : (allStops.find((s) => s.id === selectedId) ?? null);
  const { prev, next } = selected ? neighbours(routeStops, selected.id) : { prev: null, next: null };
  const highlightedId = touring ? (t.step?.stop?.id ?? null) : selectedId;

  return (
    <div className={`app${touring ? " is-touring" : ""}`}>
      <main className="app-main" aria-label="Campus tour map">
        {/* DOM order is Tab order: title and main actions first, then the map and its 33 stop markers. */}
        <h1 className="app-title">
          <span className="app-title-fiu">FIU</span> Campus Tour
        </h1>

        {!touring && (
          <MapControls
            disabled={!map}
            onResetView={() => map && resetView(map, routeBounds)}
            onShowRoute={() => map && showWholeRoute(map, routeBounds)}
          />
        )}

        {!touring && !chooserOpen && (
          <div className="action-bar" role="toolbar" aria-label="Tour actions">
            <button
              type="button"
              className="btn btn-secondary"
              aria-expanded={listOpen}
              aria-controls={STOP_LIST_ID}
              onClick={() => {
                setSelectedId(null);
                setListOpen((o) => !o);
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M9 6h11M9 12h11M9 18h11" />
                <circle cx="4.5" cy="6" r="1.2" fill="currentColor" />
                <circle cx="4.5" cy="12" r="1.2" fill="currentColor" />
                <circle cx="4.5" cy="18" r="1.2" fill="currentColor" />
              </svg>
              Stops
            </button>
            <button
              ref={startButtonRef}
              type="button"
              className="btn btn-primary"
              disabled={!map}
              onClick={() => {
                setSelectedId(null);
                setListOpen(false);
                setChooserOpen(true);
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M8 5v14l11-7z" />
              </svg>
              Start tour
            </button>
          </div>
        )}

        <MapView token={token} onMapReady={setMap} />
        {map && <RouteLayer map={map} route={route} start={tour.welcome.coordinates} />}
        {map && (
          <StopMarkers
            map={map}
            stops={allStops}
            total={routeStops.length}
            selectedId={highlightedId}
            onSelect={touring ? t.goToStop : selectStop}
          />
        )}

        {chooserOpen && <StartTourSheet onStart={startTour} onCancel={() => setChooserOpen(false)} />}

        {listOpen && !touring && (
          <StopList
            id={STOP_LIST_ID}
            routeStops={routeStops}
            otherStops={alsoOnCampus}
            selectedId={selectedId}
            onSelect={selectStop}
            onClose={() => setListOpen(false)}
          />
        )}

        {selected && (
          <StopCard
            stop={selected}
            total={routeStops.length}
            prev={prev}
            next={next}
            onSelect={selectStop}
            onClose={() => setSelectedId(null)}
          />
        )}

        {touring && t.step && (
          <>
            <TourCard step={t.step} total={routeStops.length} phase={t.state.phase} sentence={t.state.sentence} />
            <TourControls
              state={t.state}
              step={t.step}
              last={t.last}
              total={routeStops.length}
              onPrev={t.prev}
              onNext={t.next}
              onSkip={t.skip}
              onTogglePlay={t.togglePlay}
              onExit={t.exit}
              onRestart={() => t.start(t.state.mode)}
              settings={{
                autoAdvance: t.state.autoAdvance,
                onAutoAdvance: t.setAutoAdvance,
                rate: settings.rate,
                onRate: (rate) => updateSettings({ rate }),
                voices: voices.map(({ voiceURI, name, lang }) => ({ voiceURI, name, lang })),
                voiceURI: settings.voiceURI,
                onVoice: (voiceURI) => updateSettings({ voiceURI }),
                speechSupported: speaker.supported,
              }}
            />
          </>
        )}
      </main>
    </div>
  );
}
