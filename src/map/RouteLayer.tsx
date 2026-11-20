import { useEffect } from "react";
import mapboxgl, { type Map as MapboxMap } from "mapbox-gl";
import type { LngLat, RouteFeature } from "../content/types";
import { cssVar } from "../lib/theme";
import { hexToRgb, makeArrowImage } from "./arrowImage";
import { ARROW_IMAGE, ROUTE_LAYERS, ROUTE_SOURCE } from "./routeIds";
import "./RouteLayer.css";

type Props = { map: MapboxMap; route: RouteFeature; start: LngLat };

/** Draws the driving route (gold line on a blue casing, with direction arrows) and the start/finish marker. */
export function RouteLayer({ map, route, start }: Props) {
  useEffect(() => {
    const gold = cssVar("--route-line", "#f5b82e");
    const blue = cssVar("--route-casing", "#081e3f");

    if (!map.hasImage(ARROW_IMAGE)) map.addImage(ARROW_IMAGE, makeArrowImage(48, hexToRgb(blue)), { pixelRatio: 2 });
    map.addSource(ROUTE_SOURCE, { type: "geojson", data: route });
    map.addLayer({
      id: "tour-route-casing",
      type: "line",
      source: ROUTE_SOURCE,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": blue, "line-width": ["interpolate", ["linear"], ["zoom"], 14, 6, 18, 14] },
    });
    map.addLayer({
      id: "tour-route-line",
      type: "line",
      source: ROUTE_SOURCE,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": gold, "line-width": ["interpolate", ["linear"], ["zoom"], 14, 3, 18, 9] },
    });
    map.addLayer({
      id: "tour-route-arrows",
      type: "symbol",
      source: ROUTE_SOURCE,
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": ["interpolate", ["linear"], ["zoom"], 14, 60, 18, 140],
        "icon-image": ARROW_IMAGE,
        "icon-size": ["interpolate", ["linear"], ["zoom"], 14, 0.5, 18, 1],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "icon-rotation-alignment": "map",
      },
    });

    const el = document.createElement("div");
    el.className = "start-marker";
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", "Start and finish: the loop between Gold Garage and Blue Garage, in front of MARC");
    el.innerHTML = '<span class="start-marker-flag" aria-hidden="true"></span><span class="start-marker-label">Start · Finish</span>';
    const marker = new mapboxgl.Marker({ element: el, anchor: "bottom-left" }).setLngLat(start).addTo(map);

    return () => {
      marker.remove();
      // The map may already be gone if the whole MapView unmounted first.
      if (!map.getStyle()) return;
      for (const id of [...ROUTE_LAYERS].reverse()) if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(ROUTE_SOURCE)) map.removeSource(ROUTE_SOURCE);
    };
  }, [map, route, start]);

  return null;
}
