import { useEffect, useRef } from "react";
import mapboxgl, { type Map as MapboxMap, type MapMouseEvent } from "mapbox-gl";
import type { Stop } from "../content/types";
import { markerDescription, markerName, nearestStop, shortLabel, zoomBand } from "./describe";
import "./StopMarkers.css";

type Props = {
  map: MapboxMap;
  stops: Stop[];
  /** Number of stops on the route, for "Stop 3 of 32". */
  total: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const HARD_HAT =
  '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M12 4a7 7 0 0 0-7 7v2H3v3h18v-3h-2v-2a7 7 0 0 0-7-7Zm-1 2.1V11h2V6.1a5 5 0 0 1 4 4.9v2H7v-2a5 5 0 0 1 4-4.9Z"/></svg>';
const BOOK =
  '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v16H6.5a.5.5 0 0 0 0 1H20v3H6.5A2.5 2.5 0 0 1 4 19.5v-15Z"/></svg>';
const BUILDING =
  '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M4 21V5l8-3 8 3v16h-6v-5h-4v5H4Zm4-12h2V7H8v2Zm6 0h2V7h-2v2Zm-6 4h2v-2H8v2Zm6 0h2v-2h-2v2Z"/></svg>';

function buildMarkerElement(stop: Stop, total: number): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  // Mapbox gives marker elements role="img" unless a role is already set, which would hide that this is a button.
  btn.setAttribute("role", "button");
  btn.className = `stop-marker stop-marker--${stop.type}`;
  if (stop.status === "under-construction") btn.classList.add("stop-marker--construction");
  btn.dataset.stopId = stop.id;
  btn.setAttribute("aria-label", markerName(stop, total));
  // Full name, type and status as the description. A hidden element can still describe.
  const descId = `stop-marker-desc-${stop.id}`;
  btn.setAttribute("aria-describedby", descId);

  const dot = document.createElement("span");
  dot.className = "stop-marker-dot";
  dot.setAttribute("aria-hidden", "true");
  if (stop.order !== null) dot.textContent = String(stop.order);
  // Off-route stops get an icon instead of a number: a book for the library, a building for the rest.
  else dot.innerHTML = stop.id === "green-library" ? BOOK : BUILDING; // static icon markup, no content strings

  if (stop.status === "under-construction") {
    const hat = document.createElement("span");
    hat.className = "stop-marker-hat";
    hat.innerHTML = HARD_HAT;
    dot.appendChild(hat);
  }

  const label = document.createElement("span");
  label.className = "stop-marker-label";
  label.setAttribute("aria-hidden", "true");
  label.textContent = shortLabel(stop);

  const desc = document.createElement("span");
  desc.id = descId;
  desc.hidden = true;
  desc.textContent = markerDescription(stop);

  // The space keeps "3" and "Bell Chapel" apart in the visible text (flex layout ignores it visually).
  btn.append(dot, document.createTextNode(" "), label, desc);
  return btn;
}

/** Numbered stop markers. Markers are buttons, so they're reachable by keyboard in route order. */
export function StopMarkers({ map, stops, total, selectedId, onSelect }: Props) {
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Create markers once per map.
  useEffect(() => {
    const markers = stops.map((stop) => {
      const el = buildMarkerElement(stop, total);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectRef.current(stop.id);
      });
      // The dot is the anchor point: the label hangs off to the right.
      return new mapboxgl.Marker({ element: el, anchor: "left", offset: [-22, 0] }).setLngLat(stop.coordinates).addTo(map);
    });

    // Tapping a building (near its stop) opens the card too.
    const onMapClick = (e: MapMouseEvent) => {
      if ((e.originalEvent?.target as Element | null)?.closest?.(".stop-marker")) return;
      const hit = nearestStop(stops, [e.lngLat.lng, e.lngLat.lat]);
      if (hit) onSelectRef.current(hit.id);
    };
    map.on("click", onMapClick);

    const container = map.getContainer();
    const setBand = () => (container.dataset.zoomBand = zoomBand(map.getZoom()));
    setBand();
    map.on("zoom", setBand);

    return () => {
      map.off("click", onMapClick);
      map.off("zoom", setBand);
      for (const m of markers) m.remove();
    };
  }, [map, stops, total]);

  // Reflect the selection without rebuilding markers.
  useEffect(() => {
    for (const el of map.getContainer().querySelectorAll<HTMLElement>(".stop-marker")) {
      const on = el.dataset.stopId === selectedId;
      el.classList.toggle("is-selected", on);
      if (on) el.setAttribute("aria-current", "true");
      else el.removeAttribute("aria-current");
    }
  }, [map, selectedId]);

  return null;
}
