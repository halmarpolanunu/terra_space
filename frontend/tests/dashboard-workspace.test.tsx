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
  return {
    ...actual,
    listEvents: vi.fn(),
    listEventTypes: vi.fn(),
    listActors: vi.fn(),
    getEvent: vi.fn(),
    publishEvent: vi.fn(),
    rejectEvent: vi.fn(),
    archiveEvent: vi.fn(),
    restoreEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
  };
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

vi.mock("@/app/dashboard/event-globe", () => {
  const locationIsResolved = (location: import("@/lib/events-api").LocationRead) =>
    location.latitude !== null && location.longitude !== null;
  const countResolvedEventLocations = (events: import("@/lib/events-api").EventRead[]) =>
    events.flatMap((event) => event.locations).filter(locationIsResolved).length;

  return {
    locationIsResolved,
    countResolvedEventLocations,
    eventLocationsToFeatureCollection: (events: import("@/lib/events-api").EventRead[]) => ({
      type: "FeatureCollection",
      features: events.flatMap((event) =>
        event.locations
          .filter(locationIsResolved)
          .map((location) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [location.longitude, location.latitude] },
            properties: { eventId: event.id },
          })),
      ),
    }),
    EventGlobe: ({ events, onProjectionModeChange, onSelect, selectedEventId }: {
      events: import("@/lib/events-api").EventRead[];
      onProjectionModeChange: (mode: "globe" | "flat" | "unavailable") => void;
      onSelect: (event: import("@/lib/events-api").EventRead) => void;
      selectedEventId?: string;
    }) => (
      <div>
        <button onClick={() => onSelect(events[0])} type="button">Map features: {countResolvedEventLocations(events)}</button>
        <button onClick={() => onProjectionModeChange("flat")} type="button">Use flat fallback</button>
        <output>Selected map event: {selectedEventId ?? "none"}</output>
      </div>
    ),
  };
});

import DashboardPage from "@/app/dashboard/page";
import * as eventsApi from "@/lib/events-api";
import * as documentsApi from "@/lib/documents-api";
import type { EventRead } from "@/lib/events-api";

function makeEvent(overrides: Partial<EventRead> = {}): EventRead {
  return {
    id: "event-1",
    title: "Bridge crossing reported",
    summary: "A convoy crossed the bridge.",
    event_date: "2026-07-10",
    event_date_precision: "exact",
    epistemic_status: "reported",
    dashboard_status: "published",
    event_type: { id: "type-1", name: "Movement", description: null, is_active: true },
    actors: [],
    locations: [{ id: "location-1", country: "Indonesia", admin1: null, city_regency: "Jakarta", latitude: -6.2, longitude: 106.8, coordinate_precision: "city_regency" }],
    sources: [{ source_id: "source-1", document_id: "doc-1", reference_label: "Field report", evidence_quote: null }],
    duplicate_flags: [],
    extraction_incomplete: false,
    extraction_incomplete_stages: [],
    created_at: "2026-07-14T00:00:00Z",
    updated_at: "2026-07-14T00:00:00Z",
    ...overrides,
  };
}

describe("Dashboard workspace", () => {
  afterEach(() => {
    currentSearch = "q=bridge&sort=title_asc";
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("retains the local service-status panel alongside the Dashboard workspace", () => {
    vi.mocked(eventsApi.listEvents).mockResolvedValue([]);
    vi.mocked(eventsApi.listEventTypes).mockResolvedValue([]);
    vi.mocked(eventsApi.listActors).mockResolvedValue([]);
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([]);

    render(<DashboardPage />);

    expect(screen.getByText("LM Studio is offline. Check Settings and try again.")).toBeVisible();
  });

  it("uses one URL filter value and derives every displayed Dashboard view from the event response", async () => {
    const pinReady = makeEvent();
    const unknownDate = makeEvent({ id: "event-2", title: "Undated event", event_date: null, event_date_precision: "unknown", locations: [] });
    const missingCoordinates = makeEvent({ id: "event-3", title: "Unlocated event", locations: [{ id: "location-3", country: "Indonesia", admin1: null, city_regency: null, latitude: null, longitude: null }] });
    vi.mocked(eventsApi.listEvents).mockImplementation(async (filters) => filters.q === "convoy" ? [pinReady] : [pinReady, unknownDate, missingCoordinates]);
    vi.mocked(eventsApi.listEventTypes).mockResolvedValue([pinReady.event_type!]);
    vi.mocked(eventsApi.listActors).mockResolvedValue([]);
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([]);

    const view = render(<DashboardPage />);
    await screen.findByRole("button", { name: "Bridge crossing reported" });

    const [eventFilters] = vi.mocked(eventsApi.listEvents).mock.calls[0];
    expect(eventFilters).toMatchObject({ q: "bridge", sort: "title_asc" });
    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    const stage = screen.getByRole("region", { name: "Global operating picture" });
    expect(stage).toBeVisible();
    expect(stage).toHaveAttribute("data-parallax-enabled", "true");
    const summaryPanel = screen.getByText("Total events").closest(".command-deck-summary")!;
    expect(within(summaryPanel).getByText("Total events")).toBeVisible();
    expect(within(summaryPanel).getByText("3")).toBeVisible();
    expect(within(summaryPanel).getByText("Mapped locations")).toBeVisible();
    expect(within(summaryPanel).getByText("1")).toBeVisible();
    expect(screen.getByRole("button", { name: "Map features: 1" })).toBeVisible();
    expect(screen.getByText("Markers · 1")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Date unknown" })).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Bridge crossing reported" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Open Events" })).toHaveAttribute("href", "/events?q=bridge&sort=title_asc");

    fireEvent.click(screen.getByRole("button", { name: "Map features: 1" }));
    expect(await screen.findByRole("heading", { name: "Event detail" })).toBeVisible();
    expect(screen.getByText("Selected map event: event-1")).toBeVisible();
    expect(screen.getByRole("button", { name: "Map features: 1" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Back to list" }));
    expect(screen.queryByRole("heading", { name: "Event detail" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Use flat fallback" }));
    expect(stage).toHaveAttribute("data-parallax-enabled", "false");

    expect(screen.queryByLabelText("Search title & summary")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Filters.*1/i }));
    fireEvent.change(screen.getByLabelText("Search title & summary"), { target: { value: "convoy" } });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard?q=convoy&sort=title_asc"));
    currentSearch = "q=convoy&sort=title_asc";
    view.rerender(<DashboardPage />);

    await waitFor(() => expect(screen.getByText("1")).toBeVisible());
    const calls = vi.mocked(eventsApi.listEvents).mock.calls;
    expect(calls.at(-1)?.[0]).toMatchObject({ q: "convoy", sort: "title_asc" });
    expect(screen.getByRole("button", { name: "Map features: 1" })).toBeVisible();
    expect(screen.queryByText("Undated event")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Events" })).toHaveAttribute("href", "/events?q=convoy&sort=title_asc");
  });

  it("shows zero summary states and opens selected map events in the detail panel", async () => {
    currentSearch = "";
    vi.mocked(eventsApi.listEvents).mockResolvedValue([]);
    vi.mocked(eventsApi.listEventTypes).mockResolvedValue([]);
    vi.mocked(eventsApi.listActors).mockResolvedValue([]);
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([]);

    render(<DashboardPage />);
    await screen.findByRole("button", { name: "Map features: 0" });
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    expect(screen.getByText("Mapped locations")).toBeVisible();
    expect(screen.getByText("No processed events yet.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Unresolved locations · 0" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Pipeline exceptions · 0" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Hidden by you · 0" })).toBeDisabled();
  });

  it("opens a list of unresolved-location events from the summary stat and can drill into one", async () => {
    currentSearch = "";
    const located = makeEvent({ id: "event-1", title: "Bridge crossing reported" });
    const unlocated = makeEvent({
      id: "event-2",
      title: "Unlocated report",
      locations: [{ id: "location-2", country: "Indonesia", admin1: null, city_regency: null, latitude: null, longitude: null }],
    });
    vi.mocked(eventsApi.listEvents).mockResolvedValue([located, unlocated]);
    vi.mocked(eventsApi.listEventTypes).mockResolvedValue([]);
    vi.mocked(eventsApi.listActors).mockResolvedValue([]);
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([]);

    render(<DashboardPage />);
    const statButton = await screen.findByRole("button", { name: "Unresolved locations · 1" });
    expect(statButton).toBeEnabled();

    fireEvent.click(statButton);
    const listDrawer = screen.getByRole("region", { name: "list panel" });
    expect(within(listDrawer).getByRole("heading", { name: "Unresolved locations" })).toBeVisible();
    expect(within(listDrawer).getByRole("button", { name: "Unlocated report" })).toBeVisible();
    expect(within(listDrawer).queryByText("Bridge crossing reported")).not.toBeInTheDocument();

    fireEvent.click(within(listDrawer).getByRole("button", { name: "Unlocated report" }));
    expect(await screen.findByRole("heading", { name: "Event detail" })).toBeVisible();
    expect(screen.getByText("Selected map event: event-2")).toBeVisible();
  });

  it("shows a pipeline exception event automatically, marked, and counted separately", async () => {
    currentSearch = "";
    const published = makeEvent({ id: "event-1", title: "Published report", dashboard_status: "published" });
    const exception = makeEvent({
      id: "event-2",
      title: "Exception report",
      dashboard_status: "hidden",
      pipeline_outcome: "EXCEPTION",
      exception_reason: "Evidence quote does not support the claimed actor.",
      locations: [],
    });
    vi.mocked(eventsApi.listEvents).mockResolvedValue([published, exception]);
    vi.mocked(eventsApi.listEventTypes).mockResolvedValue([]);
    vi.mocked(eventsApi.listActors).mockResolvedValue([]);
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([]);

    render(<DashboardPage />);
    await screen.findByRole("button", { name: "Exception report" });
    fireEvent.click(screen.getByRole("button", { name: /Event register/i }));
    const registerDrawer = screen.getByRole("region", { name: "register panel" });
    expect(within(registerDrawer).getByText("Exception")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Event register/i }));

    const exceptionsStat = screen.getByRole("button", { name: "Pipeline exceptions · 1" });
    expect(exceptionsStat).toBeEnabled();

    fireEvent.click(exceptionsStat);
    const listDrawer = screen.getByRole("region", { name: "list panel" });
    expect(within(listDrawer).getByRole("heading", { name: "Pipeline exceptions" })).toBeVisible();
    expect(within(listDrawer).getByRole("button", { name: "Exception report" })).toBeVisible();
    expect(within(listDrawer).queryByText("Published report")).not.toBeInTheDocument();

    fireEvent.click(within(listDrawer).getByRole("button", { name: "Exception report" }));
    expect(await screen.findByText("Pipeline exception")).toBeVisible();
    expect(screen.getByText("Evidence quote does not support the claimed actor.")).toBeVisible();
  });

  it("hides an event from the browser only, and un-hides it from the Hidden by you panel", async () => {
    currentSearch = "";
    const eventA = makeEvent({ id: "event-1", title: "First report" });
    const eventB = makeEvent({ id: "event-2", title: "Second report", locations: [] });
    vi.mocked(eventsApi.listEvents).mockResolvedValue([eventA, eventB]);
    vi.mocked(eventsApi.listEventTypes).mockResolvedValue([]);
    vi.mocked(eventsApi.listActors).mockResolvedValue([]);
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([]);

    render(<DashboardPage />);
    await screen.findByRole("button", { name: "First report" });

    fireEvent.click(screen.getByRole("button", { name: "First report" }));
    expect(await screen.findByRole("heading", { name: "Event detail" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Hide" }));

    expect(screen.queryByRole("button", { name: "First report" })).not.toBeInTheDocument();
    const hiddenStat = screen.getByRole("button", { name: "Hidden by you · 1" });
    expect(hiddenStat).toBeEnabled();

    fireEvent.click(hiddenStat);
    const listDrawer = screen.getByRole("region", { name: "list panel" });
    expect(within(listDrawer).getByRole("heading", { name: "Hidden by you" })).toBeVisible();
    fireEvent.click(within(listDrawer).getByRole("button", { name: "Unhide" }));

    expect(screen.getByRole("button", { name: "Hidden by you · 0" })).toBeDisabled();
  });

  it("publishes a hidden event from the detail panel and refetches the event list", async () => {
    currentSearch = "";
    const hidden = makeEvent({ id: "event-1", title: "Hidden report", dashboard_status: "hidden", pipeline_outcome: "EXCEPTION" });
    const published = { ...hidden, dashboard_status: "published" as const, pipeline_outcome: null };
    vi.mocked(eventsApi.listEvents).mockResolvedValueOnce([hidden]).mockResolvedValue([published]);
    vi.mocked(eventsApi.listEventTypes).mockResolvedValue([]);
    vi.mocked(eventsApi.listActors).mockResolvedValue([]);
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([]);
    vi.mocked(eventsApi.getEvent).mockResolvedValue(published);
    vi.mocked(eventsApi.publishEvent).mockResolvedValue(published);

    render(<DashboardPage />);
    await screen.findByRole("button", { name: "Hidden report" });

    fireEvent.click(screen.getByRole("button", { name: "Hidden report" }));
    expect(await screen.findByRole("heading", { name: "Event detail" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(eventsApi.publishEvent).toHaveBeenCalledWith("event-1"));
    await waitFor(() => expect(eventsApi.listEvents).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Published")).toBeVisible();
  });
});
