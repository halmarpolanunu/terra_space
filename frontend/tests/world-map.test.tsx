import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const map = {
  addLayer: vi.fn(),
  addSource: vi.fn(),
  getBearing: vi.fn(() => 0),
  getCanvas: vi.fn(() => ({ style: { cursor: "" } })),
  getSource: vi.fn(),
  on: vi.fn(),
  remove: vi.fn(),
  rotateTo: vi.fn(),
  setPaintProperty: vi.fn(),
  setSky: vi.fn(),
  setProjection: vi.fn(),
};

vi.mock("maplibre-gl", () => ({ default: { addProtocol: vi.fn(), Map: vi.fn(function Map() { return map; }) } }));

vi.mock("pmtiles", () => ({
  PMTiles: vi.fn(function PMTiles() {}),
  Protocol: class { add = vi.fn(); tile = vi.fn(); },
}));

import {
  EVENT_PIN_HALO_LAYER_ID,
  EVENT_PIN_LAYER_ID,
  MAP_UNAVAILABLE_MESSAGE,
  WORLD_PMTILES_URL,
  WorldMap,
  worldMapStyle,
} from "@/components/world-map";

describe("offline world map configuration", () => {
  it("uses only a local PMTiles source", () => {
    expect(WORLD_PMTILES_URL).toBe("/api/backend/api/maps/world.pmtiles");
    expect(JSON.stringify(worldMapStyle)).not.toMatch(/https?:\/\//);
  });

  it("explains when the local map package is unavailable", () => {
    render(<p>{MAP_UNAVAILABLE_MESSAGE}</p>);

    expect(screen.getByText("Map package is not installed.")).toBeVisible();
  });

  it("uses globe projection after the local map loads and retains the unavailable error message", async () => {
    let errorListener: (() => void) | undefined;
    map.on.mockImplementation((event: string, listener: () => void) => {
      if (event === "load") listener();
      if (event === "error") errorListener = listener;
      return map;
    });
    render(<WorldMap />);

    await waitFor(() => expect(map.setProjection).toHaveBeenCalledWith({ type: "globe" }));
    expect(map.setSky).toHaveBeenCalledWith(expect.objectContaining({ "horizon-color": "#2d1b05", "atmosphere-blend": 0.65 }));
    expect(map.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: EVENT_PIN_HALO_LAYER_ID, type: "circle" }),
    );
    expect(map.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: EVENT_PIN_LAYER_ID, type: "circle" }),
    );
    errorListener?.();
    expect(await screen.findByRole("alert")).toHaveTextContent(MAP_UNAVAILABLE_MESSAGE);
  });

  it("waits for MapLibre idle, then stops rotating for map movement and keyboard interaction", () => {
    vi.useFakeTimers();
    map.rotateTo.mockClear();
    const listeners = new Map<string, () => void>();
    map.on.mockImplementation((event: string, ...args: unknown[]) => {
      const listener = args.at(-1);
      if (typeof listener === "function") listeners.set(event, listener as () => void);
      if (event === "load" && typeof listener === "function") (listener as () => void)();
      return map;
    });

    render(<WorldMap />);
    vi.advanceTimersByTime(1000);
    expect(map.rotateTo).not.toHaveBeenCalled();

    listeners.get("idle")?.();
    vi.advanceTimersByTime(1000);
    expect(map.rotateTo).toHaveBeenCalledTimes(1);

    listeners.get("move")?.();
    vi.advanceTimersByTime(1000);
    expect(map.rotateTo).toHaveBeenCalledTimes(1);

    listeners.get("idle")?.();
    vi.advanceTimersByTime(1000);
    expect(map.rotateTo).toHaveBeenCalledTimes(2);

    listeners.get("keydown")?.();
    vi.advanceTimersByTime(1000);
    expect(map.rotateTo).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("keeps auto-rotation disabled when reduced motion is requested", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    map.rotateTo.mockClear();
    const listeners = new Map<string, () => void>();
    map.on.mockImplementation((event: string, ...args: unknown[]) => {
      const listener = args.at(-1);
      if (typeof listener === "function") listeners.set(event, listener as () => void);
      if (event === "load" && typeof listener === "function") (listener as () => void)();
      return map;
    });

    render(<WorldMap />);
    listeners.get("idle")?.();
    vi.advanceTimersByTime(5000);
    expect(map.rotateTo).not.toHaveBeenCalled();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does not label the map as a flat fallback when only its sky styling fails", () => {
    map.setProjection.mockImplementation(() => undefined);
    map.setSky.mockImplementation(() => { throw new Error("sky unavailable"); });
    map.on.mockImplementation((event: string, ...args: unknown[]) => {
      const listener = args.at(-1);
      if (event === "load" && typeof listener === "function") (listener as () => void)();
      return map;
    });

    render(<WorldMap />);
    expect(map.setProjection).toHaveBeenCalledWith({ type: "globe" });
    expect(screen.queryByText("Flat map fallback")).not.toBeInTheDocument();
  });
});
