import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const source = { setData: vi.fn() };
const map = {
  addLayer: vi.fn(),
  addSource: vi.fn(),
  getBearing: vi.fn(() => 0),
  getCanvas: vi.fn(() => ({ style: { cursor: "" } })),
  getSource: vi.fn(() => source),
  getZoom: vi.fn(() => 2.2),
  off: vi.fn(),
  on: vi.fn(),
  remove: vi.fn(),
  rotateTo: vi.fn(),
  setPaintProperty: vi.fn(),
  setSky: vi.fn(),
  setProjection: vi.fn(),
};

const markerInstances: { element: HTMLElement; setLngLat: ReturnType<typeof vi.fn>; addTo: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> }[] = [];

vi.mock("maplibre-gl", () => ({
  default: {
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
    addProtocol: vi.fn(),
  },
}));

vi.mock("pmtiles", () => ({
  PMTiles: vi.fn(function PMTiles() {}),
  Protocol: class { add = vi.fn(); tile = vi.fn(); },
}));

import {
  EventGlobe,
  buildEventMapData,
  countResolvedEventLocations,
  eventLocationsToClusters,
  eventLocationsToFeatureCollection,
} from "@/app/dashboard/event-globe";
import type { EventRead } from "@/lib/events-api";

function makeEvent(overrides: Partial<EventRead> = {}): EventRead {
  return {
    id: "event-1", title: "Bridge crossing reported", summary: "Summary", event_date: "2026-07-10", event_date_precision: "exact",
    epistemic_status: "claim", review_status: "approved", event_type: null, actors: [],
    locations: [{ id: "location-1", country: "Indonesia", admin1: "Jakarta", city_regency: "Jakarta", latitude: -6.2, longitude: 106.8, coordinate_precision: "city_regency" }],
    sources: [], duplicate_flags: [], created_at: "2026-07-14T00:00:00Z", updated_at: "2026-07-14T00:00:00Z", ...overrides,
  };
}

describe("EventGlobe", () => {
  afterEach(() => {
    vi.clearAllMocks();
    markerInstances.length = 0;
  });

  it("groups events sharing an identical resolved coordinate into one cluster instead of stacked pins", () => {
    const eventA = makeEvent({ id: "event-1" });
    const eventB = makeEvent({ id: "event-2", title: "Second report at the same point" });
    const { pins, clusters } = buildEventMapData([eventA, eventB]);

    expect(pins.features).toHaveLength(0);
    expect(clusters).toEqual([
      { coordinates: [106.8, -6.2], count: 2, eventIds: ["event-1", "event-2"], locationLabel: "Jakarta, Jakarta, Indonesia" },
    ]);
    expect(eventLocationsToClusters([eventA, eventB])).toEqual(clusters);
  });

  it("keeps a single event with two same-coordinate locations as one pin, not a self-cluster", () => {
    const event = makeEvent({
      locations: [
        { id: "location-1", country: "Indonesia", admin1: "Jakarta", city_regency: "Jakarta", latitude: -6.2, longitude: 106.8, coordinate_precision: "city_regency" },
        { id: "location-2", country: "Indonesia", admin1: "Jakarta", city_regency: "Jakarta", latitude: -6.2, longitude: 106.8, coordinate_precision: "city_regency" },
      ],
    });

    const { pins, clusters } = buildEventMapData([event]);

    expect(pins.features).toHaveLength(1);
    expect(clusters).toHaveLength(0);
  });

  it("counts every resolved location regardless of clustering", () => {
    const eventA = makeEvent({ id: "event-1" });
    const eventB = makeEvent({ id: "event-2" });
    const eventC = makeEvent({
      id: "event-3",
      locations: [{ id: "location-3", country: "Indonesia", admin1: null, city_regency: null, latitude: null, longitude: 106.8 }],
    });

    expect(countResolvedEventLocations([eventA, eventB, eventC])).toBe(2);
  });

  it("resolves a cluster's event ids back to full events and reports them on click", () => {
    map.on.mockImplementation((event: string, listener: () => void) => {
      if (event === "load") listener();
      return map;
    });
    const eventA = makeEvent({ id: "event-1" });
    const eventB = makeEvent({ id: "event-2", title: "Second report at the same point" });
    const onSelectCluster = vi.fn();

    render(<EventGlobe events={[eventA, eventB]} onSelect={vi.fn()} onSelectCluster={onSelectCluster} />);

    expect(markerInstances).toHaveLength(1);
    markerInstances[0].element.click();

    expect(onSelectCluster).toHaveBeenCalledWith([eventA, eventB], "Jakarta, Jakarta, Indonesia");
  });

  it("creates one local GeoJSON point for each complete event location and none for null coordinates", () => {
    const features = eventLocationsToFeatureCollection([
      makeEvent(),
      makeEvent({ id: "event-2", locations: [{ id: "location-2", country: "Indonesia", admin1: null, city_regency: null, latitude: null, longitude: 106.8 }] }),
    ]);

    expect(features.features).toHaveLength(1);
    expect(features.features[0]).toMatchObject({ geometry: { type: "Point", coordinates: [106.8, -6.2] }, properties: { eventId: "event-1", title: "Bridge crossing reported", locationLabel: "Jakarta, Jakarta, Indonesia", epistemicStatus: "claim", coordinatePrecision: "city_regency" } });
  });

  it("loads the existing offline map, adds its GeoJSON source after load, and removes it on unmount", async () => {
    map.on.mockImplementation((event: string, listener: () => void) => {
      if (event === "load") listener();
      return map;
    });
    const { unmount } = render(<EventGlobe events={[makeEvent()]} onSelect={vi.fn()} />);

    await waitFor(() => expect(map.addSource).toHaveBeenCalledWith("event-pins", expect.objectContaining({ type: "geojson" })));
    expect(map.setProjection).toHaveBeenCalledWith({ type: "globe" });
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: "event-pins" }));
    unmount();
    expect(map.remove).toHaveBeenCalledOnce();
  });

  it("passes the selected event and projection mode reporting through to the world map", async () => {
    const onProjectionModeChange = vi.fn();
    map.on.mockImplementation((event: string, listener: () => void) => {
      if (event === "load") listener();
      return map;
    });

    const { rerender } = render(
      <EventGlobe
        events={[makeEvent()]}
        onProjectionModeChange={onProjectionModeChange}
        onSelect={vi.fn()}
        selectedEventId="event-1"
      />,
    );

    await waitFor(() => expect(onProjectionModeChange).toHaveBeenCalledWith("globe"));
    expect(map.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "event-pins",
        paint: expect.objectContaining({
          "circle-radius": expect.arrayContaining(["case"]),
        }),
      }),
    );

    map.setPaintProperty.mockClear();
    rerender(
      <EventGlobe
        events={[makeEvent()]}
        onProjectionModeChange={onProjectionModeChange}
        onSelect={vi.fn()}
        selectedEventId={undefined}
      />,
    );

    await waitFor(() => {
      expect(map.setPaintProperty).toHaveBeenCalledWith("event-pins", "circle-radius", 6);
    });
  });

  it("preserves event selection through the existing pin click handler", () => {
    let clickListener: ((event: { features?: { properties?: { eventId?: string } }[] }) => void) | undefined;
    map.on.mockImplementation((event: string, ...args: unknown[]) => {
      const listener = args.at(-1);
      if (event === "load" && typeof listener === "function") (listener as () => void)();
      if (event === "click" && typeof listener === "function") {
        clickListener = listener as typeof clickListener;
      }
      return map;
    });
    const event = makeEvent();
    const onSelect = vi.fn();

    render(<EventGlobe events={[event]} onSelect={onSelect} />);
    clickListener?.({ features: [{ properties: { eventId: event.id } }] });

    expect(onSelect).toHaveBeenCalledWith(event);
  });
});
