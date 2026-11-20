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
  easeTo = vi.fn();
  flyTo = vi.fn();
  fitBounds = vi.fn();
  touchZoomRotate = { disableRotation: vi.fn() };
  keyboard = { disableRotation: vi.fn() };

  constructor(options: Record<string, unknown>) {
    this.options = options;
    FakeMap.instances.push(this);
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
    FakeMarker.instances.push(this);
  }
  setLngLat(lngLat: [number, number]) {
    this.lngLat = lngLat;
    return this;
  }
  addTo(map: FakeMap) {
    this.map = map;
    document.body.appendChild(this.element);
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
