import { vi } from "vitest";

type Handler = (e?: unknown) => void;

/** Minimal stand-in for mapboxgl.Map. jsdom has no WebGL, so tests drive events by hand. */
export class FakeMap {
  static instances: FakeMap[] = [];
  options: Record<string, unknown>;
  handlers: Record<string, Handler[]> = {};
  removed = false;
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

  remove() {
    this.removed = true;
  }

  static get last(): FakeMap {
    return FakeMap.instances[FakeMap.instances.length - 1];
  }

  static reset() {
    FakeMap.instances = [];
  }
}

export const mapboxMock = { Map: FakeMap };
