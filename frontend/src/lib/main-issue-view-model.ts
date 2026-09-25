import type { BridgeCandidateReview, Phase5Event } from "@/lib/bridge-api";

export type MainIssueStory = {
  sourceId: string;
  sourceTitle: string;
  label: string;
  summary: string;
  evidenceQuote: string;
  processedAt: string;
  events: Phase5Event[];
};

export function buildMainIssueStories(reviews: BridgeCandidateReview[], events: Phase5Event[]): MainIssueStory[] {
  const eventsBySource = new Map<string, Phase5Event[]>();
  for (const event of events) {
    const sourceEvents = eventsBySource.get(event.phase1_source_id) ?? [];
    sourceEvents.push(event);
    eventsBySource.set(event.phase1_source_id, sourceEvents);
  }

  return reviews
    .filter((review) => review.main_issue_status === "MAIN_ISSUE_FOUND" && review.main_issue?.label)
    .map((review) => ({
      sourceId: review.phase1_source_id,
      sourceTitle: review.source_title,
      label: review.main_issue!.label!,
      summary: review.main_issue?.summary ?? "",
      evidenceQuote: review.main_issue?.evidence_quote ?? "",
      processedAt: review.processed_at,
      events: eventsBySource.get(review.phase1_source_id) ?? [],
    }))
    .sort((a, b) => b.processedAt.localeCompare(a.processedAt));
}
