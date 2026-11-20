import { useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import { getMapboxToken } from "./lib/config";
import { MissingToken } from "./components/MissingToken";
import { MapView } from "./map/MapView";
import { MapControls } from "./map/MapControls";
import { resetView, showWholeRoute } from "./map/camera";
import "./App.css";

export function App({ token = getMapboxToken() }: { token?: string | null }) {
  const [map, setMap] = useState<MapboxMap | null>(null);

  if (!token) return <MissingToken />;

  return (
    <div className="app">
      <main className="app-main" aria-label="Campus tour map">
        <MapView token={token} onMapReady={setMap} />
        <h1 className="app-title">
          <span className="app-title-fiu">FIU</span> Campus Tour
        </h1>
        <MapControls
          disabled={!map}
          onResetView={() => map && resetView(map)}
          onShowRoute={() => map && showWholeRoute(map)}
        />
      </main>
    </div>
  );
}
