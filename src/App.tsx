import { useCallback, useEffect, useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import { getMapboxToken } from "./lib/config";
import { focusOffset, useSidePanelLayout } from "./lib/layout";
import { MissingToken } from "./components/MissingToken";
import { MapView } from "./map/MapView";
import { MapControls } from "./map/MapControls";
import { RouteLayer } from "./map/RouteLayer";
import { focusStop, resetView, showWholeRoute } from "./map/camera";
import { allStops, alsoOnCampus, route, routeBounds, routeStops, tour } from "./content";
import { StopMarkers } from "./stops/StopMarkers";
import { StopCard } from "./stops/StopCard";
import { StopList } from "./stops/StopList";
import { neighbours } from "./stops/describe";
import "./App.css";

const STOP_LIST_ID = "stop-list";

export function App({ token = getMapboxToken() }: { token?: string | null }) {
  const [map, setMap] = useState<MapboxMap | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const sidePanel = useSidePanelLayout();

  useEffect(() => {
    // Dev builds only: lets Playwright tests and the coordinate survey drive the live map.
    if (import.meta.env.DEV) (window as unknown as { __tourMap?: MapboxMap | null }).__tourMap = map;
  }, [map]);

  const selected = allStops.find((s) => s.id === selectedId) ?? null;

  const selectStop = useCallback(
    (id: string) => {
      setSelectedId(id);
      setListOpen(false);
      const stop = allStops.find((s) => s.id === id);
      if (map && stop) focusStop(map, stop.coordinates, focusOffset(sidePanel));
    },
    [map, sidePanel],
  );

  if (!token) return <MissingToken />;

  const { prev, next } = selected ? neighbours(routeStops, selected.id) : { prev: null, next: null };

  return (
    <div className="app">
      <main className="app-main" aria-label="Campus tour map">
        <MapView token={token} onMapReady={setMap} />
        {map && <RouteLayer map={map} route={route} start={tour.welcome.coordinates} />}
        {map && (
          <StopMarkers map={map} stops={allStops} total={routeStops.length} selectedId={selectedId} onSelect={selectStop} />
        )}
        <h1 className="app-title">
          <span className="app-title-fiu">FIU</span> Campus Tour
        </h1>
        <MapControls
          disabled={!map}
          onResetView={() => map && resetView(map)}
          onShowRoute={() => map && showWholeRoute(map, routeBounds)}
        />

        <div className="action-bar" role="toolbar" aria-label="Tour actions">
          <button
            type="button"
            className="btn btn-primary"
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
        </div>

        {listOpen && (
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
      </main>
    </div>
  );
}
