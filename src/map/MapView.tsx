import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { CAMPUS_MAX_BOUNDS, INITIAL_VIEW, MAP_STYLE, MAX_ZOOM, MIN_ZOOM } from "./campus";
import "./MapView.css";

type Props = {
  token: string;
  /** Called once the style has loaded, with the live map. Called with null on unmount. */
  onMapReady?: (map: mapboxgl.Map | null) => void;
};

export function MapView({ token, onMapReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onMapReady);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    onReadyRef.current = onMapReady;
  }, [onMapReady]);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      accessToken: token,
      style: MAP_STYLE,
      ...INITIAL_VIEW,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      maxBounds: CAMPUS_MAX_BOUNDS,
      // Keep the map north-up and flat: simpler for guests in a moving vehicle.
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      respectPrefersReducedMotion: true,
      performanceMetricsCollection: false,
      // Mapbox's terms require the logo and attribution to stay visible. Bottom sheets, the left side
      // panel and the tour bar cover both bottom corners, so both go top-right, under the camera buttons.
      logoPosition: "top-right",
      attributionControl: false,
    });
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "top-right");
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();

    map.on("load", () => onReadyRef.current?.(map));
    map.on("error", (e) => {
      // Auth failures usually mean the token is wrong or not allowed for this URL.
      const status = (e.error as { status?: number } | undefined)?.status;
      if (status === 401 || status === 403) {
        setLoadError("The map couldn't load. The Mapbox token is invalid or not allowed for this web address.");
      }
    });

    return () => {
      onReadyRef.current?.(null);
      map.remove();
    };
  }, [token]);

  return (
    <div className="map-view">
      <div
        ref={containerRef}
        className="map-canvas"
        role="region"
        aria-label="Satellite map of FIU's Modesto A. Maidique Campus. Use arrow keys to pan and plus or minus to zoom."
      />
      {loadError && (
        <p className="map-error" role="alert">
          {loadError}
        </p>
      )}
    </div>
  );
}
