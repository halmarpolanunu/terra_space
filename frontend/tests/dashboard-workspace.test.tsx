import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
let currentSearch = "q=bridge&sort=title_asc";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

vi.mock("@/lib/events-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/events-api")>("@/lib/events-api");
  return { ...actual, getDashboardSummary: vi.fn(), listActors: vi.fn(), listEventTypes: vi.fn(), listEvents: vi.fn() };
});

vi.mock("@/lib/documents-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/documents-api")>("@/lib/documents-api");
  return { ...actual, listDocuments: vi.fn() };
});

vi.mock("@/components/service-status", () => ({
  ServiceStatusPanel: () => <p>LM Studio is offline. Check Settings and try again.</p>,
}));

vi.mock("maplibre-gl", () => ({
  default: { Map: vi.fn(function Map() { return { on: vi.fn(), remove: vi.fn() }; }), addProtocol: vi.fn() },
}));

vi.mock("pmtiles", () => ({
  PMTiles: vi.fn(function PMTiles() {}),
  Protocol: class { add = vi.fn(); tile = vi.fn(); },
}));

vi.mock("@/app/dashboard/event-globe", () => ({
  eventLocationsToFeatureCollection: (events: import("@/lib/events-api").EventRead[]) => ({
    type: "FeatureCollection",
    features: events.flatMap((event) =>
      event.locations
        .filter((location) => location.latitude !== null && location.longitude !== null)
        .map((location) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [location.longitude, location.latitude] },
          properties: { eventId: event.id },
        })),
    ),
  }),
  EventGlobe: ({ events, onSelect }: { events: import("@/lib/events-api").EventRead[]; onSelect: (event: import("@/lib/events-api").EventRead) => void }) => (
    <button onClick={() => onSelect(events[0])} type="button">Map features: {events.flatMap((event) => event.locations.filter((location) => location.latitude !== null && location.longitude !== null)).length}</button>
  ),
}));

import DashboardPage from "@/app/dashboard/page";
import * as eventsApi from "@/lib/events-api";
import * as documentsApi from "@/lib/documents-api";
import type { EventRead } from "@/lib/events-api";

function makeEvent(overrides: Partial<EventRead> = {}): EventRead {
  return {
    id: "event-1",
    title: "Bridge crossing reported",
    summary: "A convoy crossed the bridge.",
    start_date: "2026-07-10",
    start_date_precision: "exact",
    end_date: null,
    end_date_precision: null,
    epistemic_status: "claim",
    review_status: "approved",
    event_type: { id: "type-1", name: "Movement", is_active: true },
    actors: [],
    locations: [{ id: "location-1", country: "Indonesia", admin1: null, city_regency: "Jakarta", latitude: -6.2, longitude: 106.8, coordinate_precision: "city_regency" }],
    sources: [{ source_id: "source-1", document_id: "doc-1", reference_label: "Field report", evidence_quote: null }],
    duplicate_flags: [],
    created_at: "2026-07-14T00:00:00Z",
    updated_at: "2026-07-14T00:00:00Z",
    ...overrides,
  };
}

const summary = {
  total_events: 99,
  new_events: 88,
  by_event_type: [{ name: "Incorrect summary response", count: 77 }],
  incomplete_date_count: 66,
  incomplete_location_count: 65,
};

describe("Dashboard workspace", () => {
  afterEach(() => {
    currentSearch = "q=bridge&sort=title_asc";
    vi.clearAllMocks();
  });

  it("retains the local service-status panel alongside the Dashboard workspace", () => {
    render(<DashboardPage />);

    expect(screen.getByText("LM Studio is offline. Check Settings and try again.")).toBeVisible();
  });

  it("uses one URL filter value and derives every displayed Dashboard view from the event response when summary differs", async () => {
    const pinReady = makeEvent();
    const unknownDate = makeEvent({ id: "event-2", title: "Undated event", start_date: null, start_date_precision: "unknown", locations: [] });
    const missingCoordinates = makeEvent({ id: "event-3", title: "Unlocated event", locations: [{ id: "location-3", country: "Indonesia", admin1: null, city_regency: null, latitude: null, longitude: null }] });
    vi.mocked(eventsApi.listEvents).mockImplementation(async (filters) => filters.q === "convoy" ? [pinReady] : [pinReady, unknownDate, missingCoordinates]);
    vi.mocked(eventsApi.getDashboardSummary).mockImplementation(async (filters) => filters.q === "convoy" ? { ...summary, total_events: 1, new_events: 0, by_event_type: [{ name: "Movement", count: 1 }], incomplete_date_count: 0, incomplete_location_count: 0 } : summary);
    vi.mocked(eventsApi.listEventTypes).mockResolvedValue([pinReady.event_type!]);
    vi.mocked(eventsApi.listActors).mockResolvedValue([]);
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([]);

    const view = render(<DashboardPage />);
    await screen.findByRole("button", { name: "Bridge crossing reported" });

    const [eventFilters] = vi.mocked(eventsApi.listEvents).mock.calls[0];
    const [summaryFilters] = vi.mocked(eventsApi.getDashboardSummary).mock.calls[0];
    expect(eventFilters).toBe(summaryFilters);
    expect(eventFilters).toMatchObject({ q: "bridge", sort: "title_asc" });
    const summaryPanel = screen.getByText("Total events").closest(".dashboard-summary")!;
    expect(within(summaryPanel).getByText("Total events")).toBeVisible();
    expect(within(summaryPanel).getByText("3")).toBeVisible();
    expect(within(summaryPanel).getByText("New in last 7 days")).toBeVisible();
    expect(within(summaryPanel).getByText("0")).toBeVisible();
    expect(within(summaryPanel).getByText("Distribution by type")).toBeVisible();
    expect(within(summaryPanel).getByText("Movement: 3")).toBeVisible();
    expect(within(summaryPanel).getByText("Incomplete date")).toBeVisible();
    expect(within(summaryPanel).getByText("Incomplete location")).toBeVisible();
    expect(within(summaryPanel).queryByText("Incorrect summary response: 77")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Map features: 1" })).toBeVisible();
    expect(screen.getByText("Markers 1")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Date unknown" })).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Bridge crossing reported" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Open Events" })).toHaveAttribute("href", "/events?q=bridge&sort=title_asc");

    fireEvent.change(screen.getByLabelText("Search title & summary"), { target: { value: "convoy" } });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard?q=convoy&sort=title_asc"));
    currentSearch = "q=convoy&sort=title_asc";
    view.rerender(<DashboardPage />);

    await waitFor(() => expect(screen.getByText("1")).toBeVisible());
    const calls = vi.mocked(eventsApi.listEvents).mock.calls;
    const summaryCalls = vi.mocked(eventsApi.getDashboardSummary).mock.calls;
    expect(calls.at(-1)?.[0]).toBe(summaryCalls.at(-1)?.[0]);
    expect(calls.at(-1)?.[0]).toMatchObject({ q: "convoy", sort: "title_asc" });
    expect(screen.getByRole("button", { name: "Map features: 1" })).toBeVisible();
    expect(screen.queryByText("Undated event")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Events" })).toHaveAttribute("href", "/events?q=convoy&sort=title_asc");
  });

  it("shows zero summary states and opens selected map events in the detail panel", async () => {
    vi.mocked(eventsApi.listEvents).mockResolvedValue([]);
    vi.mocked(eventsApi.getDashboardSummary).mockResolvedValue({ total_events: 0, new_events: 0, by_event_type: [], incomplete_date_count: 0, incomplete_location_count: 0 });
    vi.mocked(eventsApi.listEventTypes).mockResolvedValue([]);
    vi.mocked(eventsApi.listActors).mockResolvedValue([]);
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([]);

    render(<DashboardPage />);
    await screen.findByText("No event types in this result.");
    expect(screen.getAllByText("0")).toHaveLength(4);
  });
});
