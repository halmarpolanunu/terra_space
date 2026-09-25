import type { Document } from "@/lib/documents-api";
import type { EventRead } from "@/lib/events-api";
import Link from "next/link";

export type PipelineCounts = {
  sourceDrafts: number;
  activeProcessing: number;
  failedProcessing: number;
  reviewDocuments: number;
  hiddenEvents: number;
  pendingDuplicates: number;
  publishedEvents: number;
};

// "hidden" here means dashboard_status="hidden" -- a pipeline exception (or a manually created
// event) awaiting a human decision. "published" replaces the old local "approved" status now that
// Supabase's phase3_events is the source of truth (see
// decisions/Fresh-Phase-Prefixed-Supabase-Architecture.md).
export function calculatePipelineCounts(
  documents: Document[],
  hiddenEvents: EventRead[],
  publishedEvents: EventRead[],
): PipelineCounts {
  return {
    sourceDrafts: documents.filter((document) => document.processing_status === "draft").length,
    activeProcessing: documents.filter(
      (document) => document.processing_status === "queued" || document.processing_status === "processing",
    ).length,
    failedProcessing: documents.filter((document) => document.processing_status === "failed").length,
    reviewDocuments: documents.filter((document) => document.processing_status === "ready_for_review").length,
    hiddenEvents: hiddenEvents.length,
    pendingDuplicates: hiddenEvents.reduce(
      (count, event) => count + event.duplicate_flags.filter((flag) => flag.resolution === "pending").length,
      0,
    ),
    publishedEvents: publishedEvents.length,
  };
}

type PipelineSummaryProps = { counts: PipelineCounts | null };

export function PipelineSummary({ counts }: PipelineSummaryProps) {
  const summary = counts ?? {
    sourceDrafts: 0,
    activeProcessing: 0,
    failedProcessing: 0,
    reviewDocuments: 0,
    hiddenEvents: 0,
    pendingDuplicates: 0,
    publishedEvents: 0,
  };
  const isEmpty = Object.values(summary).every((count) => count === 0);

  return (
    <div className="sense-flow" aria-label="Terra Sense local flow">
      {isEmpty && <p>No local sources or events are waiting right now.</p>}
      {summary.failedProcessing > 0 && (
        <p role="alert">{summary.failedProcessing} document{summary.failedProcessing === 1 ? "" : "s"} needs attention after processing failed.</p>
      )}
      {summary.pendingDuplicates > 0 && (
        <p role="alert">{summary.pendingDuplicates} duplicate decision{summary.pendingDuplicates === 1 ? " is" : "s are"} waiting for review.</p>
      )}
      <ol className="sense-flow-stages">
        <li>
          <article>
            <h2>Sources</h2>
            <p>{summary.sourceDrafts} source draft{summary.sourceDrafts === 1 ? "" : "s"} ready to prepare.</p>
            <Link href="/documents">Open Sources</Link>
          </article>
        </li>
        <li aria-hidden="true" className="sense-flow-connection">→</li>
        <li>
          <article>
            <h2>Prepare &amp; process</h2>
            <p>{summary.activeProcessing} document{summary.activeProcessing === 1 ? "" : "s"} queued or processing.</p>
            <p>{summary.reviewDocuments} document{summary.reviewDocuments === 1 ? "" : "s"} ready for review.</p>
          </article>
        </li>
        <li aria-hidden="true" className="sense-flow-connection">→</li>
        <li>
          <article>
            <h2>Event Review</h2>
            <p>{summary.hiddenEvents} event{summary.hiddenEvents === 1 ? "" : "s"} hidden as a pipeline exception, awaiting a decision.</p>
            <Link href="/event-review">Open Event Review</Link>
          </article>
        </li>
        <li aria-hidden="true" className="sense-flow-connection">→</li>
        <li>
          <article>
            <h2>Terra Insight</h2>
            <p>Home and Explore lead with current Main Issues and show their linked Phase 5 events.</p>
            <Link href="/home">Open Terra Insight</Link>
          </article>
        </li>
      </ol>
    </div>
  );
}
