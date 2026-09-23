import { describe, expect, it } from "vitest";
import type { PipelineReview, BridgeSource, Phase5Event } from "@/lib/bridge-api";
import { summarizePipelineStages } from "@/app/prepare/pipeline-stage-summary";

describe("pipeline stage summary", () => {
  it("uses named stage scopes and deduplicates retained candidate reviews", () => {
    const sources = [{ id: "s1", processing_status: "completed" }] as BridgeSource[];
    const review = { phase1_source_id: "s1", main_issue_status: "VALID", event_detection_status: "EVENT_CANDIDATES_FOUND", event_candidates: [{ title: "One", status: "NEEDS_REVIEW" }] } as PipelineReview;
    const events = [{ id: "e1", phase4_status: "INCOMPLETE", classification: { status: "UNCLASSIFIED" }, qualification: { status: "NOT_FINAL" } }] as Phase5Event[];
    const stages = summarizePipelineStages(sources, [review, review], events);
    expect(stages.map((stage) => stage.id)).toEqual(["sources", "issues", "candidates", "facts", "generation", "qualification"]);
    expect(stages[2]).toMatchObject({ total: 1, attention: 1, scope: "candidate records", attentionScope: "candidate records" });
    expect(stages[3].attention).toBe(0);
    expect(stages[3].note).toBe("1 safe but incomplete");
    expect(stages[5].attention).toBe(1);
  });
});
