import { render, screen, waitFor } from "@testing-library/react";
import maplibregl from "maplibre-gl";
import { describe, expect, it, vi } from "vitest";

const map = {
  addLayer: vi.fn(),
  addSource: vi.fn(),
  getBearing: vi.fn(() => 0),
  getCanvas: vi.fn(() => ({ style: { cursor: "" } })),
  getSource: vi.fn(),
  off: vi.fn(),
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
  it("opens at the globe-dominant command-deck scale", () => {
    render(<WorldMap />);

    expect(maplibregl.Map).toHaveBeenLastCalledWith(
      expect.objectContaining({ zoom: 2.2 }),
    );
  });

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
    map.setPaintProperty.mockClear();
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
    expect(map.setPaintProperty).not.toHaveBeenCalledWith(
      EVENT_PIN_HALO_LAYER_ID,
      "circle-radius-transition",
      expect.anything(),
    );
    expect(map.setPaintProperty).not.toHaveBeenCalledWith(
      EVENT_PIN_HALO_LAYER_ID,
      "circle-opacity-transition",
      expect.anything(),
    );
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

  it("modestly emphasizes the selected pin and updates the same layers when selection changes", async () => {
    map.setProjection.mockImplementation(() => undefined);
    map.setSky.mockImplementation(() => undefined);
    map.setPaintProperty.mockClear();
    map.on.mockImplementation((event: string, ...args: unknown[]) => {
      const listener = args.at(-1);
      if (event === "load" && typeof listener === "function") (listener as () => void)();
      return map;
    });

    const { rerender } = render(<WorldMap selectedEventId="event-1" />);

    expect(map.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: EVENT_PIN_HALO_LAYER_ID,
        paint: expect.objectContaining({
          "circle-radius": ["case", ["==", ["get", "eventId"], "event-1"], 15, 11],
          "circle-opacity": ["case", ["==", ["get", "eventId"], "event-1"], 0.48, 0.34],
        }),
      }),
    );
    expect(map.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: EVENT_PIN_LAYER_ID,
        paint: expect.objectContaining({
          "circle-radius": ["case", ["==", ["get", "eventId"], "event-1"], 7.5, 6],
          "circle-opacity": ["case", ["==", ["get", "eventId"], "event-1"], 1, 0.78],
          "circle-stroke-width": ["case", ["==", ["get", "eventId"], "event-1"], 2, 1],
        }),
      }),
    );

    map.setPaintProperty.mockClear();
    rerender(<WorldMap selectedEventId="event-2" />);

    await waitFor(() => {
      expect(map.setPaintProperty).toHaveBeenCalledWith(
        EVENT_PIN_LAYER_ID,
        "circle-radius",
        ["case", ["==", ["get", "eventId"], "event-2"], 7.5, 6],
      );
    });
    expect(map.setPaintProperty).toHaveBeenCalledWith(
      EVENT_PIN_HALO_LAYER_ID,
      "circle-radius",
      ["case", ["==", ["get", "eventId"], "event-2"], 15, 11],
    );
  });

  it("reports globe, flat fallback, and unavailable projection modes without recreating the map", async () => {
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();
    let errorListener: (() => void) | undefined;
    map.setProjection.mockImplementation(() => undefined);
    map.setSky.mockImplementation(() => undefined);
    map.on.mockImplementation((event: string, ...args: unknown[]) => {
      const listener = args.at(-1);
      if (event === "load" && typeof listener === "function") (listener as () => void)();
      if (event === "error" && typeof listener === "function") errorListener = listener as () => void;
      return map;
    });
    vi.mocked(maplibregl.Map).mockClear();

    const { rerender } = render(<WorldMap onProjectionModeChange={firstCallback} />);
    await waitFor(() => expect(firstCallback).toHaveBeenCalledWith("globe"));

    rerender(<WorldMap onProjectionModeChange={secondCallback} />);
    expect(maplibregl.Map).toHaveBeenCalledTimes(1);
    errorListener?.();
    await waitFor(() => expect(secondCallback).toHaveBeenCalledWith("unavailable"));

    map.setProjection.mockImplementation(() => { throw new Error("globe unavailable"); });
    const flatCallback = vi.fn();
    render(<WorldMap onProjectionModeChange={flatCallback} />);
    await waitFor(() => expect(flatCallback).toHaveBeenCalledWith("flat"));
    expect(await screen.findByText("Flat map fallback")).toBeVisible();
  });

  it("clears ambient intervals and registered listeners on unmount", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
    const clearInterval = vi.spyOn(window, "clearInterval");
    map.off.mockClear();
    map.setProjection.mockImplementation(() => undefined);
    map.setSky.mockImplementation(() => undefined);
    map.on.mockImplementation((event: string, ...args: unknown[]) => {
      const listener = args.at(-1);
      if (event === "load" && typeof listener === "function") (listener as () => void)();
      return map;
    });

    const { unmount } = render(<WorldMap />);
    unmount();

    expect(clearInterval).toHaveBeenCalledTimes(2);
    expect(map.off).toHaveBeenCalledTimes(13);
    expect(map.off).toHaveBeenCalledWith("error", expect.any(Function));
    expect(map.off).toHaveBeenCalledWith("load", expect.any(Function));
    expect(map.off).toHaveBeenCalledWith("click", EVENT_PIN_LAYER_ID, expect.any(Function));
    expect(map.off).toHaveBeenCalledWith("idle", expect.any(Function));
    expect(map.remove).toHaveBeenCalled();

    clearInterval.mockRestore();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});
