import type { BridgeSource, Phase5Event, PipelineReview } from "@/lib/bridge-api";

export type PipelineStageSummary = {
  id: "sources" | "issues" | "candidates" | "facts" | "generation" | "qualification";
  label: string; total: number; attention: number; attentionScope: string; scope: string; href: string; description: string; note?: string;
};

export function summarizePipelineStages(sources: BridgeSource[], reviews: PipelineReview[], events: Phase5Event[]): PipelineStageSummary[] {
  const uniqueReviews = [...new Map(reviews.map((review) => [review.phase1_source_id, review])).values()];
  const candidates = uniqueReviews.flatMap((review) => review.event_candidates ?? []);
  const uniqueEvents = [...new Map(events.map((event) => [event.id, event])).values()];
  return [
    { id: "sources", label: "Sources", total: sources.length, attention: sources.filter((source) => source.processing_status === "failed").length, attentionScope: "sources", scope: "source records", href: "/documents", description: "Collected material entering the local pipeline." },
    { id: "issues", label: "Main Issue", total: uniqueReviews.length, attention: uniqueReviews.filter((review) => review.main_issue_status === "FAILED" || review.main_issue_status === "NEEDS_REVIEW").length, attentionScope: "source reviews", scope: "reviewed sources", href: "/issues", description: "The central issue found in each processed source." },
    { id: "candidates", label: "Event Candidates", total: candidates.length, attention: candidates.filter((candidate) => candidate.status === "NEEDS_REVIEW" || candidate.status === "FAILED").length, attentionScope: "candidate records", scope: "candidate records", href: "/prepare#candidates", description: "Possible events retained from source text.", note: `${uniqueReviews.filter((review) => review.event_detection_status === "FAILED" || review.event_detection_status === "NOT_RUN").length} source detection failures or not run` },
    { id: "facts", label: "Event Facts", total: uniqueEvents.length, attention: uniqueEvents.filter((event) => event.phase4_status === "NEEDS_REVIEW" || event.phase4_status === "FAILED").length, attentionScope: "Phase 5 records", scope: "Phase 5 event records", href: "/explore", description: "Grounded event details, dates, and geography.", note: `${uniqueEvents.filter((event) => event.phase4_status === "INCOMPLETE").length} safe but incomplete` },
    { id: "generation", label: "Event Generation", total: uniqueEvents.length, attention: uniqueEvents.filter((event) => event.classification.status !== "CLASSIFIED").length, attentionScope: "Phase 5 records", scope: "Phase 5 event records", href: "/explore", description: "Event types and generated records ready for inspection." },
    { id: "qualification", label: "Final Qualification", total: uniqueEvents.length, attention: uniqueEvents.filter((event) => event.qualification.status !== "FINAL").length, attentionScope: "Phase 5 records", scope: "Phase 5 event records", href: "/explore", description: "Final, Not Final, and pending outcomes." },
  ];
}
