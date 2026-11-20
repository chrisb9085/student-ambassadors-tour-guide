import { vi } from "vitest";

type Handler = (e?: unknown) => void;

/** Minimal stand-in for mapboxgl.Map. jsdom has no WebGL, so tests drive events by hand. */
export class FakeMap {
  static instances: FakeMap[] = [];
  options: Record<string, unknown>;
  handlers: Record<string, Handler[]> = {};
  removed = false;
  sources = new Map<string, unknown>();
  layers = new Map<string, Record<string, unknown>>();
  images = new Map<string, unknown>();
  zoom = 15.6;
  container: HTMLDivElement;
  easeTo = vi.fn();
  flyTo = vi.fn();
  fitBounds = vi.fn();
  setPadding = vi.fn();
  jumpTo = vi.fn((opts: { zoom?: number }) => {
    if (typeof opts.zoom === "number") this.zoom = opts.zoom;
  });
  touchZoomRotate = { disableRotation: vi.fn() };
  keyboard = { disableRotation: vi.fn() };

  constructor(options: Record<string, unknown>) {
    this.options = options;
    // Like Mapbox, markers live inside a container element in the document.
    this.container = document.createElement("div");
    this.container.className = "fake-map-container";
    document.body.appendChild(this.container);
    FakeMap.instances.push(this);
  }

  getContainer() {
    return this.container;
  }
  getZoom() {
    return this.zoom;
  }
  /** Test helper: change zoom and fire the zoom event. */
  setZoomForTest(z: number) {
    this.zoom = z;
    this.emit("zoom");
  }

  on(event: string, handler: Handler) {
    (this.handlers[event] ??= []).push(handler);
    return this;
  }

  off(event: string, handler: Handler) {
    this.handlers[event] = (this.handlers[event] ?? []).filter((h) => h !== handler);
    return this;
  }

  /** Test helper: fire a map event. */
  emit(event: string, payload?: unknown) {
    for (const h of this.handlers[event] ?? []) h(payload);
  }

  addSource(id: string, source: unknown) {
    if (this.sources.has(id)) throw new Error(`source ${id} already exists`);
    this.sources.set(id, source);
  }
  getSource(id: string) {
    return this.sources.get(id);
  }
  removeSource(id: string) {
    this.sources.delete(id);
  }
  addLayer(layer: Record<string, unknown>) {
    if (this.layers.has(layer.id as string)) throw new Error(`layer ${layer.id} already exists`);
    this.layers.set(layer.id as string, layer);
  }
  getLayer(id: string) {
    return this.layers.get(id);
  }
  removeLayer(id: string) {
    this.layers.delete(id);
  }
  addImage(id: string, image: unknown) {
    this.images.set(id, image);
  }
  hasImage(id: string) {
    return this.images.has(id);
  }
  getStyle() {
    return this.removed ? undefined : { layers: [...this.layers.values()] };
  }

  remove() {
    this.removed = true;
  }

  static get last(): FakeMap {
    return FakeMap.instances[FakeMap.instances.length - 1];
  }

  static reset() {
    for (const m of FakeMap.instances) m.container.remove();
    FakeMap.instances = [];
    FakeMarker.instances = [];
  }
}

/** Stand-in for mapboxgl.Marker: keeps the element in the document so tests can query it. */
export class FakeMarker {
  static instances: FakeMarker[] = [];
  element: HTMLElement;
  lngLat: [number, number] | null = null;
  map: FakeMap | null = null;

  constructor(options: { element?: HTMLElement } = {}) {
    this.element = options.element ?? document.createElement("div");
    // Same as Mapbox: markers become role="img" with a generic label unless the element already has them.
    if (!this.element.hasAttribute("role")) this.element.setAttribute("role", "img");
    if (!this.element.hasAttribute("aria-label")) this.element.setAttribute("aria-label", "Map marker");
    FakeMarker.instances.push(this);
  }
  setLngLat(lngLat: [number, number]) {
    this.lngLat = lngLat;
    return this;
  }
  addTo(map: FakeMap) {
    this.map = map;
    map.container.appendChild(this.element);
    return this;
  }
  getElement() {
    return this.element;
  }
  remove() {
    this.element.remove();
    this.map = null;
    return this;
  }
}

export const mapboxMock = { Map: FakeMap, Marker: FakeMarker };
