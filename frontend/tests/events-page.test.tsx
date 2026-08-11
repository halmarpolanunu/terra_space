import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
let currentSearch = "q=bridge&sort=title_asc";
let currentDocumentId = "doc-1";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(currentSearch),
  useParams: () => ({ documentId: currentDocumentId }),
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
  return { ...actual, listDocuments: vi.fn(), getDocument: vi.fn() };
});

import EventsPage from "@/app/events/page";
import { EventDetail } from "@/app/events/event-detail";
import { EventEditor } from "@/app/events/event-editor";
import DocumentSourcePage from "@/app/documents/[documentId]/page";
import * as eventsApi from "@/lib/events-api";
import * as documentsApi from "@/lib/documents-api";
import type { EventRead, TaxonomyPathSegment } from "@/lib/events-api";
import type { Document } from "@/lib/documents-api";

const TEST_TAXONOMY_PATH: TaxonomyPathSegment[] = [
  { id: "domain-1", name: "Test Domain", level: "domain" },
  { id: "category-1", name: "Test Category", level: "category" },
  { id: "subcategory-1", name: "Test Subcategory", level: "subcategory" },
  { id: "type-1", name: "Movement", level: "event_type" },
];

function makeEvent(overrides: Partial<EventRead> = {}): EventRead {
  return {
    id: "event-1",
    title: "Bridge crossing reported",
    summary: "A convoy crossed the bridge.",
    event_date: "2026-07-10",
    event_date_precision: "exact",
    epistemic_status: "reported",
    dashboard_status: "published",
    event_type: {
      id: "type-1",
      name: "Movement",
      description: null,
      is_active: true,
      taxonomy_path: TEST_TAXONOMY_PATH,
    },
    actors: [],
    locations: [],
    sources: [],
    duplicate_flags: [],
    extraction_incomplete: false,
    extraction_incomplete_stages: [],
    created_at: "2026-07-14T00:00:00Z",
    updated_at: "2026-07-14T00:00:00Z",
    ...overrides,
  };
}

function makeDocument(overrides: Partial<Document> = {}): Document {
  return { id: "doc-1", title: "Field report", content: "The full source report.", publication_date: "2026-07-11", source_url: "https://example.test/report", input_date: "2026-07-14T00:00:00Z", processing_status: "completed", processing_error: null, created_at: "2026-07-14T00:00:00Z", updated_at: "2026-07-14T00:00:00Z", attachments: [], ...overrides };
}

// Events now has full read/write authority against Supabase's phase3_events -- see
// decisions/Fresh-Phase-Prefixed-Supabase-Architecture.md. This replaced the earlier read-only
// Supabase preview once the full application cutover landed.
describe("EventsPage", () => {
  afterEach(() => {
    currentSearch = "q=bridge&sort=title_asc";
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("restores URL filters, requests events, and replaces the URL on changes", async () => {
    vi.mocked(eventsApi.listEvents).mockResolvedValue([
      makeEvent(),
      makeEvent({ id: "event-2", title: "Second published event" }),
    ]);
    vi.mocked(eventsApi.listEventTypes).mockResolvedValue([]);
    vi.mocked(eventsApi.listActors).mockResolvedValue([]);
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([]);

    render(<EventsPage />);

    await screen.findByText("Bridge crossing reported");
    expect(eventsApi.listEvents).toHaveBeenCalledWith(expect.objectContaining({ q: "bridge", sort: "title_asc" }));
    expect(screen.getByLabelText("Search title & summary")).toHaveValue("bridge");

    fireEvent.change(screen.getByLabelText("Search title & summary"), { target: { value: "convoy" } });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/events?q=convoy&sort=title_asc"));
  });

  it("opening an event offers Edit and status actions appropriate to its dashboard status", async () => {
    const event = makeEvent({ dashboard_status: "hidden" });
    vi.mocked(eventsApi.listEvents).mockResolvedValue([event]);
    vi.mocked(eventsApi.listEventTypes).mockResolvedValue([]);
    vi.mocked(eventsApi.listActors).mockResolvedValue([]);
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([]);

    render(<EventsPage />);
    await screen.findByText(event.title);

    fireEvent.click(screen.getByRole("button", { name: event.title }));

    expect(screen.getByRole("button", { name: "Edit" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Publish" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Delete" })).toBeVisible();
  });

  it("opens a selected event with its full facts and a linked source reference", async () => {
    const event = makeEvent({
      actors: [{ role: "source", actor: { id: "actor-1", name: "North Unit", is_active: true } }],
      locations: [{ id: "location-1", country: "Indonesia", admin1: "Jakarta", city_regency: "Jakarta", latitude: -6.2, longitude: 106.8, coordinate_precision: "city_regency" }],
      sources: [{ source_id: "source-1", document_id: "doc-1", reference_label: "Field report", evidence_quote: "A convoy crossed the bridge." }],
    });
    vi.mocked(eventsApi.listEvents).mockResolvedValue([event]);
    vi.mocked(eventsApi.listEventTypes).mockResolvedValue([]);
    vi.mocked(eventsApi.listActors).mockResolvedValue([]);
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([]);

    const { container } = render(<EventsPage />);
    expect(container.querySelector(".events-view")).toHaveAttribute("data-view", "list");
    fireEvent.click(await screen.findByRole("button", { name: event.title }));

    expect(container.querySelector(".events-view")).toHaveAttribute("data-view", "detail");
    expect(screen.getByText(event.summary)).toBeVisible();
    expect(screen.getByText("Event date")).toBeVisible();
    expect(screen.getByText("2026-07-10")).toBeVisible();
    expect(screen.getByText("North Unit (source)")).toBeVisible();
    expect(screen.getByText("Jakarta, Jakarta, Indonesia (city/regency coordinates)")).toBeVisible();
    expect(screen.getByRole("link", { name: "Field report" })).toHaveAttribute("href", "/documents/doc-1?from=%2Fevents%3Fq%3Dbridge%26sort%3Dtitle_asc");
    expect(screen.getByText(/sources and evidence are read-only/i)).toBeVisible();
  });

  it("returns to the filtered list when filters change while an event is selected", async () => {
    const event = makeEvent();
    vi.mocked(eventsApi.listEvents).mockResolvedValue([event]);
    vi.mocked(eventsApi.listEventTypes).mockResolvedValue([]);
    vi.mocked(eventsApi.listActors).mockResolvedValue([]);
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([]);

    render(<EventsPage />);
    fireEvent.click(await screen.findByRole("button", { name: event.title }));
    expect(screen.getByRole("heading", { name: event.title })).toBeVisible();

    fireEvent.change(screen.getByLabelText("Search title & summary"), { target: { value: "different event" } });

    expect(screen.queryByRole("heading", { name: event.title })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: event.title })).toBeVisible();
  });

  it("shows a pipeline exception event automatically, marked as an exception", async () => {
    const published = makeEvent({ id: "event-1", title: "Published event", dashboard_status: "published" });
    const exception = makeEvent({
      id: "event-2",
      title: "Exception event",
      dashboard_status: "hidden",
      pipeline_outcome: "EXCEPTION",
    });
    vi.mocked(eventsApi.listEvents).mockResolvedValue([published, exception]);
    vi.mocked(eventsApi.listEventTypes).mockResolvedValue([]);
    vi.mocked(eventsApi.listActors).mockResolvedValue([]);
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([]);

    render(<EventsPage />);

    expect(await screen.findByRole("button", { name: "Exception event" })).toBeVisible();
    expect(screen.getByText("Exception")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Published event" })).toBeVisible();
  });

  it("hides an event from this browser's view and un-hides it from the event detail", async () => {
    const eventA = makeEvent({ id: "event-1", title: "First event" });
    const eventB = makeEvent({ id: "event-2", title: "Second event" });
    vi.mocked(eventsApi.listEvents).mockResolvedValue([eventA, eventB]);
    vi.mocked(eventsApi.listEventTypes).mockResolvedValue([]);
    vi.mocked(eventsApi.listActors).mockResolvedValue([]);
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([]);

    render(<EventsPage />);
    await screen.findByRole("button", { name: "First event" });

    fireEvent.click(screen.getByRole("button", { name: "First event" }));
    expect(screen.getByRole("heading", { name: "First event" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Hide" }));

    // The open detail panel stays on the same event and now offers Unhide instead of Hide.
    expect(screen.getByRole("heading", { name: "First event" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Unhide" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Back to list" }));
    expect(screen.queryByRole("button", { name: "First event" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Second event" })).toBeVisible();
  });

  it("publishes a hidden event and refetches the event list and selected event", async () => {
    const hidden = makeEvent({ id: "event-1", title: "Hidden event", dashboard_status: "hidden" });
    const published = { ...hidden, dashboard_status: "published" as const };
    vi.mocked(eventsApi.listEvents).mockResolvedValueOnce([hidden]).mockResolvedValue([published]);
    vi.mocked(eventsApi.listEventTypes).mockResolvedValue([]);
    vi.mocked(eventsApi.listActors).mockResolvedValue([]);
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([]);
    vi.mocked(eventsApi.getEvent).mockResolvedValue(published);
    vi.mocked(eventsApi.publishEvent).mockResolvedValue(published);

    render(<EventsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Hidden event" }));
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(eventsApi.publishEvent).toHaveBeenCalledWith("event-1"));
    await waitFor(() => expect(eventsApi.listEvents).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Published")).toBeVisible();
  });

  it("edits an event and shows the saved result", async () => {
    const event = makeEvent();
    const edited = { ...event, title: "Updated title" };
    vi.mocked(eventsApi.listEvents).mockResolvedValueOnce([event]).mockResolvedValue([edited]);
    vi.mocked(eventsApi.listEventTypes).mockResolvedValue([event.event_type!]);
    vi.mocked(eventsApi.listActors).mockResolvedValue([]);
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([]);
    vi.mocked(eventsApi.getEvent).mockResolvedValue(edited);
    vi.mocked(eventsApi.updateEvent).mockResolvedValue(edited);

    render(<EventsPage />);
    fireEvent.click(await screen.findByRole("button", { name: event.title }));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Updated title" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(eventsApi.updateEvent).toHaveBeenCalledWith("event-1", expect.objectContaining({ title: "Updated title" })));
    expect(await screen.findByRole("heading", { name: "Updated title" })).toBeVisible();
  });

  it("deletes an event after confirmation and returns to the list", async () => {
    currentSearch = "";
    const event = makeEvent();
    vi.mocked(eventsApi.listEvents).mockResolvedValueOnce([event]).mockResolvedValue([]);
    vi.mocked(eventsApi.listEventTypes).mockResolvedValue([]);
    vi.mocked(eventsApi.listActors).mockResolvedValue([]);
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([]);
    vi.mocked(eventsApi.deleteEvent).mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<EventsPage />);
    fireEvent.click(await screen.findByRole("button", { name: event.title }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(eventsApi.deleteEvent).toHaveBeenCalledWith("event-1"));
    expect(await screen.findByText("No processed events yet.")).toBeVisible();
  });
});

describe("DocumentSourcePage", () => {
  afterEach(() => { currentDocumentId = "doc-1"; vi.clearAllMocks(); });

  it("renders completed source text read-only and reports an unknown document clearly", async () => {
    vi.mocked(documentsApi.getDocument).mockResolvedValue(makeDocument());
    const { rerender } = render(await DocumentSourcePage({ params: Promise.resolve({ documentId: "doc-1" }), searchParams: Promise.resolve({ from: "/events?q=convoy" }) }));
    expect(await screen.findByText("Field report")).toBeVisible();
    expect(screen.getByText("The full source report.")).toHaveClass("source-document");
    expect(screen.getByRole("link", { name: /back to events/i })).toHaveAttribute("href", "/events?q=convoy");

    vi.mocked(documentsApi.getDocument).mockRejectedValue(new Error("Document not found."));
    currentDocumentId = "missing";
    rerender(await DocumentSourcePage({ params: Promise.resolve({ documentId: "missing" }), searchParams: Promise.resolve({}) }));
    expect(await screen.findByText("Document not found.")).toBeVisible();
  });
});

describe("EventDetail edit permissions", () => {
  it("shows a non-exact event date together with its precision", () => {
    render(
      <EventDetail
        event={makeEvent({ event_date: "2026-07-10", event_date_precision: "month" })}
        eventsPath="/events"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("2026-07-10 (month)")).toBeVisible();
  });

  it("does not expose Edit for a merged audit record", () => {
    render(<EventDetail event={makeEvent({ dashboard_status: "merged" })} eventsPath="/events" onClose={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("shows Delete for every dashboard status except merged", () => {
    const { rerender } = render(<EventDetail event={makeEvent({ dashboard_status: "merged" })} eventsPath="/events" onClose={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();

    rerender(<EventDetail event={makeEvent({ dashboard_status: "rejected" })} eventsPath="/events" onClose={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Delete" })).toBeVisible();

    rerender(<EventDetail event={makeEvent({ dashboard_status: "hidden" })} eventsPath="/events" onClose={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Delete" })).toBeVisible();

    rerender(<EventDetail event={makeEvent({ dashboard_status: "published" })} eventsPath="/events" onClose={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Delete" })).toBeVisible();
  });
});

describe("EventEditor type selection", () => {
  it("accepts year-only event dates in the event editor", async () => {
    const onSave = vi.fn();
    render(
      <EventEditor
        actorOptions={[]}
        event={makeEvent()}
        eventTypeOptions={[makeEvent().event_type!]}
        onCancel={vi.fn()}
        onSave={onSave}
      />,
    );

    expect(screen.getByLabelText("Event date")).toHaveAttribute("type", "text");
    fireEvent.change(screen.getByLabelText("Event date"), { target: { value: "2026" } });
    fireEvent.change(screen.getByLabelText("Event date precision"), { target: { value: "year" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      event_date: "2026",
      event_date_precision: "year",
    })));
  });

  it("updates the definition when the event type changes", () => {
    const movement = {
      id: "movement", name: "Movement",
      description: "Movement of people or equipment.", is_active: true,
      taxonomy_path: TEST_TAXONOMY_PATH,
    };
    const protest = {
      id: "protest", name: "Protest",
      description: "Collective public demonstration.", is_active: true,
      taxonomy_path: [
        { id: "domain-2", name: "Test Domain", level: "domain" as const },
        { id: "category-2", name: "Test Category", level: "category" as const },
        { id: "subcategory-2", name: "Test Subcategory", level: "subcategory" as const },
        { id: "protest", name: "Protest", level: "event_type" as const },
      ],
    };
    render(
      <EventEditor
        actorOptions={[]}
        event={makeEvent({ event_type: movement })}
        eventTypeOptions={[movement, protest]}
        onCancel={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Event type"), { target: { value: "Protest" } });
    expect(screen.getByText("Collective public demonstration.")).toBeVisible();
    expect(screen.getByLabelText("Event date")).toBeVisible();
    expect(screen.getByLabelText("Event date precision")).toBeVisible();
    expect(screen.queryByLabelText(/start date/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/end date/i)).not.toBeInTheDocument();
  });

  it("submits the selected type by name, not id, so it resolves to the correct taxonomy leaf", async () => {
    const movement = {
      id: "movement", name: "Movement",
      description: "Movement of people or equipment.", is_active: true,
      taxonomy_path: TEST_TAXONOMY_PATH,
    };
    const protest = {
      id: "protest", name: "Protest",
      description: "Collective public demonstration.", is_active: true,
      taxonomy_path: [
        { id: "domain-2", name: "Test Domain", level: "domain" as const },
        { id: "category-2", name: "Test Category", level: "category" as const },
        { id: "subcategory-2", name: "Test Subcategory", level: "subcategory" as const },
        { id: "protest", name: "Protest", level: "event_type" as const },
      ],
    };
    const onSave = vi.fn();
    render(
      <EventEditor
        actorOptions={[]}
        event={makeEvent({ event_type: movement })}
        eventTypeOptions={[movement, protest]}
        onCancel={vi.fn()}
        onSave={onSave}
      />,
    );
    fireEvent.change(screen.getByLabelText("Event type"), { target: { value: "Protest" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ event_type: { existing: "Protest" } }),
      ),
    );
  });

  it("offers only supported active event types", () => {
    render(<EventEditor actorOptions={[]} event={makeEvent()} eventTypeOptions={[makeEvent().event_type!]} onCancel={vi.fn()} onSave={vi.fn()} />);

    expect(within(screen.getByLabelText("Event type")).queryByRole("option", { name: "Not stated" })).not.toBeInTheDocument();
  });

  it("shows an accurate placeholder when an existing event has no type", () => {
    render(<EventEditor actorOptions={[]} event={makeEvent({ event_type: null })} eventTypeOptions={[makeEvent().event_type!]} onCancel={vi.fn()} onSave={vi.fn()} />);

    const typeSelect = screen.getByLabelText("Event type");
    expect(typeSelect).toHaveValue("");
    expect(within(typeSelect).getByRole("option", { name: "Choose an event type" })).toBeDisabled();
  });
});
