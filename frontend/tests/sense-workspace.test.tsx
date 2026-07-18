import { afterEach, describe, expect, it, vi } from "vitest";

import { calculatePipelineCounts } from "@/app/sense/pipeline-summary";
import { listEventsByReviewStatus, type EventRead } from "@/lib/events-api";
import type { Document } from "@/lib/documents-api";

function makeDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: "document-1",
    title: "Local source",
    content: "Source content.",
    document_date: "2026-07-18",
    publication_date: null,
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
    start_date: null,
    start_date_precision: null,
    end_date: null,
    end_date_precision: null,
    epistemic_status: "claim",
    review_status: "draft",
    event_type: null,
    actors: [],
    locations: [],
    sources: [],
    duplicate_flags: [],
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

    await listEventsByReviewStatus("draft");

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
      pendingDuplicates: 1,
      approvedEvents: 3,
    });
  });
});
