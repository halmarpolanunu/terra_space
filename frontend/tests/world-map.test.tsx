import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import maplibregl from "maplibre-gl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let mapCenter = { lng: 0, lat: 20 };

const map = {
  addLayer: vi.fn(),
  addSource: vi.fn(),
  getCanvas: vi.fn(() => ({ style: { cursor: "" } })),
  getCenter: vi.fn(() => mapCenter),
  getSource: vi.fn(),
  getZoom: vi.fn(() => 2.2),
  jumpTo: vi.fn((options: { center: [number, number] }) => {
    mapCenter = { lng: options.center[0], lat: options.center[1] };
  }),
  off: vi.fn(),
  on: vi.fn(),
  remove: vi.fn(),
  setPaintProperty: vi.fn(),
  setSky: vi.fn(),
  setProjection: vi.fn(),
};

const markerInstances: { element: HTMLElement; setLngLat: ReturnType<typeof vi.fn>; addTo: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> }[] = [];

vi.mock("maplibre-gl", () => ({
  default: {
    addProtocol: vi.fn(),
    Map: vi.fn(function Map() { return map; }),
    Marker: vi.fn(function Marker({ element }: { element: HTMLElement }) {
      const instance = {
        element,
        setLngLat: vi.fn().mockReturnThis(),
        addTo: vi.fn().mockReturnThis(),
        remove: vi.fn(() => {
          const index = markerInstances.indexOf(instance);
          if (index !== -1) markerInstances.splice(index, 1);
        }),
      };
      markerInstances.push(instance);
      return instance;
    }),
  },
}));

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
  beforeEach(() => {
    mapCenter = { lng: 0, lat: 20 };
  });

  afterEach(() => {
    markerInstances.length = 0;
    vi.unstubAllGlobals();
  });

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

  it("rotates continuously via animation frames and pauses briefly after direct user interaction", () => {
    vi.useFakeTimers();
    map.jumpTo.mockClear();
    const listeners = new Map<string, () => void>();
    map.on.mockImplementation((event: string, ...args: unknown[]) => {
      const listener = args.at(-1);
      if (typeof listener === "function") listeners.set(event, listener as () => void);
      if (event === "load" && typeof listener === "function") (listener as () => void)();
      return map;
    });

    render(<WorldMap />);
    vi.advanceTimersByTime(1000);
    expect(map.jumpTo).toHaveBeenCalled();
    // Default speed is 4 deg/s; after ~1s of simulated frames the globe should have
    // turned about 4 degrees, confirming continuous per-frame motion accumulates correctly.
    expect(mapCenter.lng).toBeCloseTo(4, 0);

    const callsBeforeInteraction = map.jumpTo.mock.calls.length;
    listeners.get("dragstart")?.();
    vi.advanceTimersByTime(500);
    // Still inside the 1.2s post-interaction cooldown: no further movement.
    expect(map.jumpTo.mock.calls.length).toBe(callsBeforeInteraction);

    vi.advanceTimersByTime(1500);
    // Cooldown has elapsed; rotation resumes.
    expect(map.jumpTo.mock.calls.length).toBeGreaterThan(callsBeforeInteraction);
    vi.useRealTimers();
  });

  it("keeps auto-rotation disabled when reduced motion is requested", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    map.jumpTo.mockClear();
    map.setPaintProperty.mockClear();
    map.on.mockImplementation((event: string, ...args: unknown[]) => {
      const listener = args.at(-1);
      if (event === "load" && typeof listener === "function") (listener as () => void)();
      return map;
    });

    render(<WorldMap />);
    vi.advanceTimersByTime(5000);
    expect(map.jumpTo).not.toHaveBeenCalled();
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
    expect(screen.queryByRole("button", { name: /globe rotation/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rotation settings" })).not.toBeInTheDocument();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("lets the owner manually pause and resume globe rotation from a toggle button", () => {
    vi.useFakeTimers();
    map.jumpTo.mockClear();
    map.on.mockImplementation((event: string, ...args: unknown[]) => {
      const listener = args.at(-1);
      if (event === "load" && typeof listener === "function") (listener as () => void)();
      return map;
    });

    render(<WorldMap />);
    vi.advanceTimersByTime(500);
    expect(map.jumpTo).toHaveBeenCalled();

    const toggle = screen.getByRole("button", { name: "Pause globe rotation" });
    fireEvent.click(toggle);
    map.jumpTo.mockClear();
    vi.advanceTimersByTime(1000);
    expect(map.jumpTo).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Resume globe rotation" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Resume globe rotation" }));
    vi.advanceTimersByTime(500);
    expect(map.jumpTo).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Pause globe rotation" })).toBeVisible();

    vi.useRealTimers();
  });

  it("keeps the rotation settings panel collapsed until the gear button is clicked", () => {
    render(<WorldMap />);

    expect(screen.queryByLabelText("Rotation speed")).not.toBeInTheDocument();
    const settingsToggle = screen.getByRole("button", { name: "Rotation settings" });
    expect(settingsToggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(settingsToggle);
    expect(screen.getByLabelText("Rotation speed")).toBeVisible();
    expect(settingsToggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(settingsToggle);
    expect(screen.queryByLabelText("Rotation speed")).not.toBeInTheDocument();
  });

  it("applies the speed slider value to the rotation rate", () => {
    vi.useFakeTimers();
    map.jumpTo.mockClear();
    map.on.mockImplementation((event: string, ...args: unknown[]) => {
      const listener = args.at(-1);
      if (event === "load" && typeof listener === "function") (listener as () => void)();
      return map;
    });

    render(<WorldMap />);
    fireEvent.click(screen.getByRole("button", { name: "Rotation settings" }));
    fireEvent.change(screen.getByLabelText("Rotation speed"), { target: { value: "8" } });

    vi.advanceTimersByTime(1000);
    // 8 deg/s for ~1s of simulated frames.
    expect(mapCenter.lng).toBeCloseTo(8, 0);
    expect(screen.getByText("8.0°/s")).toBeVisible();

    vi.useRealTimers();
  });

  it("reverses which way the globe spins from the direction toggle", () => {
    vi.useFakeTimers();
    map.jumpTo.mockClear();
    map.on.mockImplementation((event: string, ...args: unknown[]) => {
      const listener = args.at(-1);
      if (event === "load" && typeof listener === "function") (listener as () => void)();
      return map;
    });

    render(<WorldMap />);
    fireEvent.click(screen.getByRole("button", { name: "Rotation settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Rotating eastward. Switch to westward." }));

    vi.advanceTimersByTime(1000);
    // Default speed 4 deg/s, reversed to westward (negative longitude direction).
    expect(mapCenter.lng).toBeCloseTo(-4, 0);
    expect(screen.getByRole("button", { name: "Rotating westward. Switch to eastward." })).toBeVisible();

    vi.useRealTimers();
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

  it("fades the decorative globe ring as the user zooms in so it stops covering the globe surface", () => {
    let zoom = 2.2;
    let zoomListener: (() => void) | undefined;
    map.getZoom.mockImplementation(() => zoom);
    map.setProjection.mockImplementation(() => undefined);
    map.setSky.mockImplementation(() => undefined);
    map.on.mockImplementation((event: string, ...args: unknown[]) => {
      const listener = args.at(-1);
      if (event === "load" && typeof listener === "function") (listener as () => void)();
      if (event === "zoom" && typeof listener === "function") zoomListener = listener as () => void;
      return map;
    });

    const { container } = render(<WorldMap />);
    expect(container.style.getPropertyValue("--globe-ring-opacity")).toBe("1");

    zoom = 3.2;
    zoomListener?.();
    expect(container.style.getPropertyValue("--globe-ring-opacity")).toBe("0.5");

    zoom = 4.2;
    zoomListener?.();
    expect(container.style.getPropertyValue("--globe-ring-opacity")).toBe("0");
  });

  it("clears ambient intervals and registered listeners on unmount", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
    const clearInterval = vi.spyOn(window, "clearInterval");
    const cancelAnimationFrame = vi.spyOn(window, "cancelAnimationFrame");
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

    expect(clearInterval).toHaveBeenCalledTimes(1);
    expect(cancelAnimationFrame).toHaveBeenCalled();
    expect(map.off).toHaveBeenCalledTimes(11);
    expect(map.off).toHaveBeenCalledWith("error", expect.any(Function));
    expect(map.off).toHaveBeenCalledWith("load", expect.any(Function));
    expect(map.off).toHaveBeenCalledWith("click", EVENT_PIN_LAYER_ID, expect.any(Function));
    expect(map.off).toHaveBeenCalledWith("dragstart", expect.any(Function));
    expect(map.remove).toHaveBeenCalled();

    clearInterval.mockRestore();
    cancelAnimationFrame.mockRestore();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders one DOM marker per cluster with a labeled count and invokes onClusterSelect on click", () => {
    map.on.mockImplementation((event: string, ...args: unknown[]) => {
      const listener = args.at(-1);
      if (event === "load" && typeof listener === "function") (listener as () => void)();
      return map;
    });
    const onClusterSelect = vi.fn();
    const cluster = { coordinates: [106.8, -6.2] as [number, number], count: 3, eventIds: ["a", "b", "c"], locationLabel: "Jakarta, Jakarta, Indonesia" };

    render(<WorldMap clusters={[cluster]} onClusterSelect={onClusterSelect} />);

    expect(markerInstances).toHaveLength(1);
    expect(markerInstances[0].element.textContent).toBe("3");
    expect(markerInstances[0].element.getAttribute("aria-label")).toBe("3 events at Jakarta, Jakarta, Indonesia");
    expect(markerInstances[0].setLngLat).toHaveBeenCalledWith(cluster.coordinates);
    expect(markerInstances[0].addTo).toHaveBeenCalledWith(map);

    markerInstances[0].element.click();
    expect(onClusterSelect).toHaveBeenCalledWith(cluster);
  });

  it("replaces cluster markers when the clusters prop changes and removes them on unmount", () => {
    map.on.mockImplementation((event: string, ...args: unknown[]) => {
      const listener = args.at(-1);
      if (event === "load" && typeof listener === "function") (listener as () => void)();
      return map;
    });
    const clusterOne = { coordinates: [106.8, -6.2] as [number, number], count: 2, eventIds: ["a", "b"], locationLabel: "Jakarta" };
    const clusterTwo = { coordinates: [0, 0] as [number, number], count: 4, eventIds: ["c", "d", "e", "f"], locationLabel: "Null Island" };

    const { rerender, unmount } = render(<WorldMap clusters={[clusterOne]} />);
    expect(markerInstances).toHaveLength(1);
    const firstMarker = markerInstances[0];
    expect(firstMarker.element.textContent).toBe("2");

    rerender(<WorldMap clusters={[clusterTwo]} />);
    expect(firstMarker.remove).toHaveBeenCalledOnce();
    expect(markerInstances).toHaveLength(1);
    expect(markerInstances[0].element.textContent).toBe("4");

    const secondMarker = markerInstances[0];
    unmount();
    expect(secondMarker.remove).toHaveBeenCalledOnce();
  });
});
