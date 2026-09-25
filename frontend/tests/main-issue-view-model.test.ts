import { describe, expect, it } from "vitest";
import type { BridgeCandidateReview, Phase5Event } from "@/lib/bridge-api";
import { buildMainIssueStories } from "@/lib/main-issue-view-model";

describe("buildMainIssueStories", () => {
  it("links Phase 5 events only through their Phase 1 source and keeps Issues separate", () => {
    const reviews = [
      { phase1_source_id: "source-a", source_title: "Article A", main_issue_status: "MAIN_ISSUE_FOUND", main_issue: { label: "Shared concern", summary: "A", evidence_quote: "Quote A" }, processed_at: "2026-09-02" },
      { phase1_source_id: "source-b", source_title: "Article B", main_issue_status: "MAIN_ISSUE_FOUND", main_issue: { label: "Shared concern", summary: "B", evidence_quote: "Quote B" }, processed_at: "2026-09-01" },
      { phase1_source_id: "source-c", source_title: "Article C", main_issue_status: "NO_MAIN_ISSUE", main_issue: null, processed_at: "2026-09-03" },
    ] as BridgeCandidateReview[];
    const events = [
      { id: "event-a", phase1_source_id: "source-a" },
      { id: "event-b", phase1_source_id: "source-b" },
      { id: "event-c", phase1_source_id: "source-c" },
    ] as Phase5Event[];

    const stories = buildMainIssueStories(reviews, events);
    expect(stories).toHaveLength(2);
    expect(stories.map((story) => story.sourceId)).toEqual(["source-a", "source-b"]);
    expect(stories.map((story) => story.events.map((event) => event.id))).toEqual([["event-a"], ["event-b"]]);
    expect(stories.map((story) => story.evidenceQuote)).toEqual(["Quote A", "Quote B"]);
  });
});
