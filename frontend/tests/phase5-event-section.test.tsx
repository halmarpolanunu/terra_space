import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/dashboard/event-globe", () => ({
  EventGlobe: () => <div aria-label="Phase 5 map canvas" />,
}));

import { Phase5EventSection } from "@/components/phase5-event-section";
import type { Phase5Event } from "@/lib/bridge-api";

describe("Phase5EventSection", () => {
  it("calls a null qualification pending instead of Not Final", () => {
    const event = { id: "pending", title: "Pending record", qualification: { status: null, reason_codes: [] }, classification: { status: null, event_type_name: null }, timeline: { event_date: null, reference_date: null }, event_geographies: [], event_geography_status: null, actor_geographies: [] } as unknown as Phase5Event;
    render(<Phase5EventSection events={[event]} showMap={false} />);
    expect(screen.getByText(/Pending · Unclassified/)).toBeVisible();
    expect(screen.queryByText(/Not Final · Unclassified/)).not.toBeInTheDocument();
  });
  it("labels a visible not-final unclassified record without inventing a date or map point", () => {
    render(<Phase5EventSection events={[{
      id: "phase5-1", phase1_source_id: "source-1", title: "Retained event", description: "Original description", evidence_quote: "Exact evidence",
      source_publication_date: "2026-09-01", event_path: "LIMITED", phase5a_status: "PREPARED",
      phase3_result_status: "NEEDS_REVIEW", phase3_result_reason: null, phase3_candidate_status: "VALID", phase3_candidate_reason: null,
      phase4_status: "INCOMPLETE", phase4_extraction_status: "FACTS_FOUND", phase4_safeguard_status: "ACCEPT", phase4_review_reason: "Location unresolved", phase4_error_message: null, facts: {},
      classification: { status: "UNCLASSIFIED", event_type_id: null, event_type_name: null, reason: "No type fits", safeguard_status: "ACCEPT", safeguard_reason: null },
      timeline: { status: "PREPARED", event_date: null, event_date_precision: "unknown", reference_date: "2026-09-01", reference_basis: "SOURCE_PUBLICATION_DATE", limitations: ["NO_LOCATION_STATED"], error_message: null },
      event_geographies: [], event_geography_status: "NO_LOCATION_STATED", actor_geographies: [], actor_geography_status: "NO_ACTORS_STATED",
      qualification: { status: "NOT_FINAL", reason_codes: ["PHASE4_NOT_PREPARED"] }, duplicate_recommendations: [],
      created_at: "2026-09-01T00:00:00Z", updated_at: "2026-09-01T00:00:00Z",
    }]} />);

    expect(screen.getByText("Phase 5 pipeline records")).toBeVisible();
    expect(screen.getByText(/Not Final · Unclassified/)).toBeVisible();
    expect(screen.getByText("Publication date reference: 2026-09-01")).toBeVisible();
    expect(screen.queryByText(/map point/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retained event" }));
    expect(screen.getByText("Original description")).toBeVisible();
    expect(screen.getByText("Exact evidence")).toBeVisible();
    expect(screen.getByText("Phase 4: INCOMPLETE")).toBeVisible();
    expect(screen.getByText("Location unresolved")).toBeVisible();
  });
});
