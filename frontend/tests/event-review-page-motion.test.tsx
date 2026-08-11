import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/bridge-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/bridge-api")>("@/lib/bridge-api");
  return { ...actual, listBridgeCandidateReviews: vi.fn() };
});

import EventReviewPage from "@/app/event-review/page";
import * as bridgeApi from "@/lib/bridge-api";
import type { BridgeCandidateReview } from "@/lib/bridge-api";

function makeReview(overrides: Partial<BridgeCandidateReview> = {}): BridgeCandidateReview {
  return {
    phase1_source_id: "source-1",
    source_title: "Bridge crossing report",
    main_issue_status: "MAIN_ISSUE_FOUND",
    main_issue: {
      label: "Bridge crossing",
      summary: "A convoy crossed the bridge.",
      evidence_quote: "A convoy crossed the bridge before dawn.",
      evidence_start: 0,
      evidence_end: 10,
      quote_grounded: true,
    },
    event_detection_status: "EVENT_CANDIDATES_FOUND",
    event_candidates: [
      {
        working_title: "Convoy crosses bridge",
        classification: "ENTITY_CENTRED_CHANGE",
        phenomenon: "A convoy crossed the bridge.",
        entities: ["Convoy"],
        evidence_quote: "A convoy crossed the bridge before dawn.",
        evidence_start: 0,
        evidence_end: 10,
        quote_grounded: true,
      },
    ],
    processed_at: "2026-08-10T00:00:00Z",
    ...overrides,
  };
}

// This route no longer pairs a document with a draft event for approve/reject -- it pages
// through one Phase 2 result per source. See
// project-knowledge/plans/2026-08-11-supabase-read-only-bridge-design.md.
describe("EventReviewPage (Supabase read-only pipeline output)", () => {
  afterEach(() => vi.clearAllMocks());

  it("shows the read-only notice and the first source's main issue and candidates", async () => {
    vi.mocked(bridgeApi.listBridgeCandidateReviews).mockResolvedValue([
      makeReview(),
      makeReview({ phase1_source_id: "source-2", source_title: "Depot activity report" }),
    ]);

    render(<EventReviewPage />);

    await screen.findByRole("status");
    expect(screen.getByText("Bridge crossing report")).toBeInTheDocument();
    expect(screen.getByText("Convoy crosses bridge")).toBeInTheDocument();
    expect(screen.getByText("Source 1 of 2")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reject/i })).not.toBeInTheDocument();
  });

  it("pages to the next and back to the previous source", async () => {
    vi.mocked(bridgeApi.listBridgeCandidateReviews).mockResolvedValue([
      makeReview(),
      makeReview({ phase1_source_id: "source-2", source_title: "Depot activity report" }),
    ]);

    render(<EventReviewPage />);
    await screen.findByText("Bridge crossing report");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Depot activity report");
    expect(screen.getByText("Source 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Prev" }));
    await screen.findByText("Bridge crossing report");
    expect(screen.getByRole("button", { name: "Prev" })).toBeDisabled();
  });

  it("shows a no-main-issue source honestly instead of inventing one", async () => {
    vi.mocked(bridgeApi.listBridgeCandidateReviews).mockResolvedValue([
      makeReview({
        main_issue_status: "NO_MAIN_ISSUE",
        main_issue: null,
        event_detection_status: "NOT_RUN",
        event_candidates: [],
      }),
    ]);

    render(<EventReviewPage />);

    await screen.findByText("No main issue");
    expect(screen.getByText("Not run (no main issue)")).toBeInTheDocument();
  });
});
