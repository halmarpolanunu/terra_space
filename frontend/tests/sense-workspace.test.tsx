import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/documents-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/documents-api")>("@/lib/documents-api");
  return { ...actual, listDocuments: vi.fn() };
});

vi.mock("@/lib/events-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/events-api")>("@/lib/events-api");
  return { ...actual, listEventsByReviewStatus: vi.fn() };
});

import { calculatePipelineCounts } from "@/app/sense/pipeline-summary";
import SensePage from "@/app/sense/page";
import * as documentsApi from "@/lib/documents-api";
import * as eventsApi from "@/lib/events-api";
import type { EventRead } from "@/lib/events-api";
import type { Document } from "@/lib/documents-api";

function makeDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: "document-1",
    title: "Local source",
    content: "Source content.",
    publication_date: "2026-07-18",
    source_url: null,
    input_date: "2026-07-18T00:00:00Z",
    processing_status: "draft",
    processing_error: null,
    created_at: "2026-07-18T00:00:00Z",
    updated_at: "2026-07-18T00:00:00Z",
    attachments: [],
    ...overrides,
  };
}

function makeEvent(overrides: Partial<EventRead> = {}): EventRead {
  return {
    id: "event-1",
    title: "Reported event",
    summary: "A reported event.",
    event_date: null,
    event_date_precision: null,
    epistemic_status: "claim",
    review_status: "draft",
    event_type: null,
    actors: [],
    locations: [],
    sources: [],
    duplicate_flags: [],
    extraction_incomplete: false,
    extraction_incomplete_stages: [],
    created_at: "2026-07-18T00:00:00Z",
    updated_at: "2026-07-18T00:00:00Z",
    ...overrides,
  };
}

describe("Terra Sense pipeline data", () => {
  afterEach(() => vi.restoreAllMocks());

  it("requests events by review status from the existing events API", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    const { listEventsByReviewStatus: requestEventsByReviewStatus } =
      await vi.importActual<typeof import("@/lib/events-api")>("@/lib/events-api");
    await requestEventsByReviewStatus("draft");

    expect(fetchMock).toHaveBeenCalledWith("/api/backend/api/events?review_status=draft");
  });

  it("calculates the read-only local pipeline counts", () => {
    const documents = [
      makeDocument({ id: "draft", processing_status: "draft" }),
      makeDocument({ id: "queued", processing_status: "queued" }),
      makeDocument({ id: "processing", processing_status: "processing" }),
      makeDocument({ id: "failed", processing_status: "failed" }),
      makeDocument({ id: "review", processing_status: "ready_for_review" }),
    ];
    const draftEvents = [
      makeEvent({ id: "draft-1" }),
      makeEvent({
        id: "draft-2",
        duplicate_flags: [{
          id: "flag-1",
          matched_event_id: "approved-1",
          matched_reason: "Similar report.",
          resolution: "pending",
          resolved_at: null,
        }, {
          id: "flag-2",
          matched_event_id: "approved-2",
          matched_reason: "Another similar report.",
          resolution: "pending",
          resolved_at: null,
        }],
      }),
    ];
    const approvedEvents = [
      makeEvent({ id: "approved-1", review_status: "approved" }),
      makeEvent({ id: "approved-2", review_status: "approved" }),
      makeEvent({ id: "approved-3", review_status: "approved" }),
    ];

    expect(calculatePipelineCounts(documents, draftEvents, approvedEvents)).toEqual({
      sourceDrafts: 1,
      activeProcessing: 2,
      failedProcessing: 1,
      reviewDocuments: 1,
      draftEvents: 2,
      pendingDuplicates: 2,
      approvedEvents: 3,
    });
  });
});

describe("Terra Sense Overview", () => {
  afterEach(() => vi.clearAllMocks());

  function renderOverview({
    documents = [],
    draftEvents = [],
    approvedEvents = [],
  }: {
    documents?: Document[];
    draftEvents?: EventRead[];
    approvedEvents?: EventRead[];
  } = {}) {
    vi.mocked(documentsApi.listDocuments).mockResolvedValue(documents);
    vi.mocked(eventsApi.listEventsByReviewStatus)
      .mockResolvedValueOnce(draftEvents)
      .mockResolvedValueOnce(approvedEvents);
    return render(<SensePage />);
  }

  it("renders the read-only local flow and its navigation links", async () => {
    renderOverview();

    expect(await screen.findByRole("heading", { name: "Terra Sense", level: 1 })).toBeVisible();
    const flow = within(screen.getByLabelText("Terra Sense local flow"));
    expect(flow.getByRole("heading", { name: "Sources" })).toBeVisible();
    expect(flow.getByRole("heading", { name: "Prepare & process" })).toBeVisible();
    expect(flow.getByRole("heading", { name: "Event Review" })).toBeVisible();
    expect(flow.getByRole("heading", { name: "Terra Insight" })).toBeVisible();
    expect(flow.getByRole("link", { name: /open sources/i })).toHaveAttribute("href", "/documents");
    expect(flow.getByRole("link", { name: /open event review/i })).toHaveAttribute("href", "/event-review");
    expect(flow.getByRole("link", { name: /open terra insight/i })).toHaveAttribute("href", "/dashboard");
    expect(flow.getByText(/only approved events enter terra insight/i)).toBeVisible();
  });

  it("shows an empty local queue when every count is zero", async () => {
    renderOverview();

    expect(await screen.findByText("No local sources or events are waiting right now.")).toBeVisible();
  });

  it("warns when document processing has failed", async () => {
    renderOverview({ documents: [makeDocument({ processing_status: "failed" })] });

    expect(await screen.findByText("1 document needs attention after processing failed.")).toBeVisible();
  });

  it("warns when a duplicate decision is pending", async () => {
    renderOverview({
      draftEvents: [makeEvent({ duplicate_flags: [{
        id: "flag-1", matched_event_id: "approved-1", matched_reason: "Similar report.",
        resolution: "pending", resolved_at: null,
      }] })],
    });

    expect(await screen.findByText("1 duplicate decision is waiting for review.")).toBeVisible();
  });

  it("reports a local API error without exposing workflow editing controls", async () => {
    vi.mocked(documentsApi.listDocuments).mockRejectedValue(new Error("Backend offline"));
    vi.mocked(eventsApi.listEventsByReviewStatus).mockResolvedValue([]);
    render(<SensePage />);

    expect(await screen.findByText("Terra Space backend is unavailable. Try again after it starts.")).toBeVisible();
    for (const name of ["Add node", "Edit workflow", "Save workflow", "Run workflow"]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });
});
