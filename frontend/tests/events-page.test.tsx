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

vi.mock("@/lib/bridge-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/bridge-api")>("@/lib/bridge-api");
  return {
    ...actual,
    listBridgeEvents: vi.fn(),
    listBridgeEventTypes: vi.fn(),
    listBridgeActors: vi.fn(),
    listBridgeSources: vi.fn(),
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
import * as bridgeApi from "@/lib/bridge-api";
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
    epistemic_status: "claim",
    review_status: "approved",
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

// Events reads Supabase read-only: no edit, approve, reject, or delete controls exist on this
// page. See project-knowledge/plans/2026-08-11-supabase-read-only-bridge-design.md.
describe("EventsPage (Supabase read-only)", () => {
  afterEach(() => {
    currentSearch = "q=bridge&sort=title_asc";
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("restores URL filters, requests events from the bridge, and replaces the URL on changes", async () => {
    vi.mocked(bridgeApi.listBridgeEvents).mockResolvedValue([
      makeEvent(),
      makeEvent({ id: "event-2", title: "Second published event" }),
    ]);
    vi.mocked(bridgeApi.listBridgeEventTypes).mockResolvedValue([]);
    vi.mocked(bridgeApi.listBridgeActors).mockResolvedValue([]);
    vi.mocked(bridgeApi.listBridgeSources).mockResolvedValue([]);

    render(<EventsPage />);

    await screen.findByText("Bridge crossing reported");
    expect(bridgeApi.listBridgeEvents).toHaveBeenCalledWith(expect.objectContaining({ q: "bridge", sort: "title_asc" }));
    expect(screen.getByLabelText("Search title & summary")).toHaveValue("bridge");

    fireEvent.change(screen.getByLabelText("Search title & summary"), { target: { value: "convoy" } });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/events?q=convoy&sort=title_asc"));
  });

  it("shows the read-only preview notice and no edit or delete controls anywhere on the page", async () => {
    const event = makeEvent();
    vi.mocked(bridgeApi.listBridgeEvents).mockResolvedValue([event]);
    vi.mocked(bridgeApi.listBridgeEventTypes).mockResolvedValue([]);
    vi.mocked(bridgeApi.listBridgeActors).mockResolvedValue([]);
    vi.mocked(bridgeApi.listBridgeSources).mockResolvedValue([]);

    render(<EventsPage />);
    await screen.findByText(event.title);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: event.title }));

    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("opens a selected event with its full facts and a plain-text (non-linked) source reference", async () => {
    const event = makeEvent({
      actors: [{ role: "source", actor: { id: "actor-1", name: "North Unit", is_active: true } }],
      locations: [{ id: "location-1", country: "Indonesia", admin1: "Jakarta", city_regency: "Jakarta", latitude: -6.2, longitude: 106.8, coordinate_precision: "city_regency" }],
      sources: [{ source_id: "source-1", document_id: null, reference_label: "Field report", evidence_quote: "A convoy crossed the bridge." }],
    });
    vi.mocked(bridgeApi.listBridgeEvents).mockResolvedValue([event]);
    vi.mocked(bridgeApi.listBridgeEventTypes).mockResolvedValue([]);
    vi.mocked(bridgeApi.listBridgeActors).mockResolvedValue([]);
    vi.mocked(bridgeApi.listBridgeSources).mockResolvedValue([]);

    const { container } = render(<EventsPage />);
    expect(container.querySelector(".events-view")).toHaveAttribute("data-view", "list");
    fireEvent.click(await screen.findByRole("button", { name: event.title }));

    expect(container.querySelector(".events-view")).toHaveAttribute("data-view", "detail");
    expect(screen.getByText(event.summary)).toBeVisible();
    expect(screen.getByText("Event date")).toBeVisible();
    expect(screen.getByText("2026-07-10")).toBeVisible();
    expect(screen.getByText("North Unit (source)")).toBeVisible();
    expect(screen.getByText("Jakarta, Jakarta, Indonesia (city/regency coordinates)")).toBeVisible();
    expect(screen.queryByRole("link", { name: "Field report" })).not.toBeInTheDocument();
    expect(screen.getByText("Field report")).toBeVisible();
    expect(screen.getByText(/sources and evidence are read-only/i)).toBeVisible();
  });

  it("returns to the filtered list when filters change while an event is selected", async () => {
    const event = makeEvent();
    vi.mocked(bridgeApi.listBridgeEvents).mockResolvedValue([event]);
    vi.mocked(bridgeApi.listBridgeEventTypes).mockResolvedValue([]);
    vi.mocked(bridgeApi.listBridgeActors).mockResolvedValue([]);
    vi.mocked(bridgeApi.listBridgeSources).mockResolvedValue([]);

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
    vi.mocked(bridgeApi.listBridgeEvents).mockResolvedValue([published, exception]);
    vi.mocked(bridgeApi.listBridgeEventTypes).mockResolvedValue([]);
    vi.mocked(bridgeApi.listBridgeActors).mockResolvedValue([]);
    vi.mocked(bridgeApi.listBridgeSources).mockResolvedValue([]);

    render(<EventsPage />);

    expect(await screen.findByRole("button", { name: "Exception event" })).toBeVisible();
    expect(screen.getByText("Exception")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Published event" })).toBeVisible();
  });

  it("hides an event from this browser's view and un-hides it from the event detail", async () => {
    const eventA = makeEvent({ id: "event-1", title: "First event" });
    const eventB = makeEvent({ id: "event-2", title: "Second event" });
    vi.mocked(bridgeApi.listBridgeEvents).mockResolvedValue([eventA, eventB]);
    vi.mocked(bridgeApi.listBridgeEventTypes).mockResolvedValue([]);
    vi.mocked(bridgeApi.listBridgeActors).mockResolvedValue([]);
    vi.mocked(bridgeApi.listBridgeSources).mockResolvedValue([]);

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

  it("does not expose Edit for rejected or merged audit records", () => {
    const { rerender } = render(<EventDetail event={makeEvent({ review_status: "rejected" })} eventsPath="/events" onClose={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();

    rerender(<EventDetail event={makeEvent({ review_status: "merged" })} eventsPath="/events" onClose={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("shows Delete only for draft or approved events, never for rejected or merged", () => {
    const { rerender } = render(<EventDetail event={makeEvent({ review_status: "rejected" })} eventsPath="/events" onClose={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();

    rerender(<EventDetail event={makeEvent({ review_status: "merged" })} eventsPath="/events" onClose={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();

    rerender(<EventDetail event={makeEvent({ review_status: "draft" })} eventsPath="/events" onClose={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Delete" })).toBeVisible();

    rerender(<EventDetail event={makeEvent({ review_status: "approved" })} eventsPath="/events" onClose={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Delete" })).toBeVisible();
  });
});

describe("EventEditor type selection", () => {
  it("accepts year-only event dates in the approved-event editor", async () => {
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

  it("updates the definition when the approved-event type changes", () => {
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
