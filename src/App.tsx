import { useEffect, useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import { getMapboxToken } from "./lib/config";
import { MissingToken } from "./components/MissingToken";
import { MapView } from "./map/MapView";
import { MapControls } from "./map/MapControls";
import { RouteLayer } from "./map/RouteLayer";
import { resetView, showWholeRoute } from "./map/camera";
import { route, routeBounds, tour } from "./content";
import "./App.css";

export function App({ token = getMapboxToken() }: { token?: string | null }) {
  const [map, setMap] = useState<MapboxMap | null>(null);

  useEffect(() => {
    // Dev builds only: lets Playwright tests and the coordinate survey drive the live map.
    if (import.meta.env.DEV) (window as unknown as { __tourMap?: MapboxMap | null }).__tourMap = map;
  }, [map]);

  if (!token) return <MissingToken />;

  return (
    <div className="app">
      <main className="app-main" aria-label="Campus tour map">
        <MapView token={token} onMapReady={setMap} />
        {map && <RouteLayer map={map} route={route} start={tour.welcome.coordinates} />}
        <h1 className="app-title">
          <span className="app-title-fiu">FIU</span> Campus Tour
        </h1>
        <MapControls
          disabled={!map}
          onResetView={() => map && resetView(map)}
          onShowRoute={() => map && showWholeRoute(map, routeBounds)}
        />
      </main>
    </div>
  );
}
