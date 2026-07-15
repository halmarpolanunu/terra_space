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

vi.mock("maplibre-gl", () => ({
  default: { Map: vi.fn(function Map() { return map; }), addProtocol: vi.fn() },
}));

vi.mock("pmtiles", () => ({
  PMTiles: vi.fn(function PMTiles() {}),
  Protocol: class { add = vi.fn(); tile = vi.fn(); },
}));

import { EventGlobe, eventLocationsToFeatureCollection } from "@/app/dashboard/event-globe";
import type { EventRead } from "@/lib/events-api";

function makeEvent(overrides: Partial<EventRead> = {}): EventRead {
  return {
    id: "event-1", title: "Bridge crossing reported", summary: "Summary", start_date: "2026-07-10", start_date_precision: "exact", end_date: null, end_date_precision: null,
    epistemic_status: "claim", review_status: "approved", event_type: null, actors: [],
    locations: [{ id: "location-1", country: "Indonesia", admin1: "Jakarta", city_regency: "Jakarta", latitude: -6.2, longitude: 106.8, coordinate_precision: "city_regency" }],
    sources: [], duplicate_flags: [], created_at: "2026-07-14T00:00:00Z", updated_at: "2026-07-14T00:00:00Z", ...overrides,
  };
}

describe("EventGlobe", () => {
  afterEach(() => vi.clearAllMocks());

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
