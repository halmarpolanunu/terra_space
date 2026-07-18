import type { Document } from "@/lib/documents-api";
import type { EventRead } from "@/lib/events-api";
import Link from "next/link";

export type PipelineCounts = {
  sourceDrafts: number;
  activeProcessing: number;
  failedProcessing: number;
  reviewDocuments: number;
  draftEvents: number;
  pendingDuplicates: number;
  approvedEvents: number;
};

export function calculatePipelineCounts(
  documents: Document[],
  draftEvents: EventRead[],
  approvedEvents: EventRead[],
): PipelineCounts {
  return {
    sourceDrafts: documents.filter((document) => document.processing_status === "draft").length,
    activeProcessing: documents.filter(
      (document) => document.processing_status === "queued" || document.processing_status === "processing",
    ).length,
    failedProcessing: documents.filter((document) => document.processing_status === "failed").length,
    reviewDocuments: documents.filter((document) => document.processing_status === "ready_for_review").length,
    draftEvents: draftEvents.length,
    pendingDuplicates: draftEvents.reduce(
      (count, event) => count + event.duplicate_flags.filter((flag) => flag.resolution === "pending").length,
      0,
    ),
    approvedEvents: approvedEvents.length,
  };
}

type PipelineSummaryProps = { counts: PipelineCounts | null };

export function PipelineSummary({ counts }: PipelineSummaryProps) {
  const summary = counts ?? {
    sourceDrafts: 0,
    activeProcessing: 0,
    failedProcessing: 0,
    reviewDocuments: 0,
    draftEvents: 0,
    pendingDuplicates: 0,
    approvedEvents: 0,
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
            <p>{summary.draftEvents} draft event{summary.draftEvents === 1 ? "" : "s"} awaiting a human decision.</p>
            <Link href="/event-review">Open Event Review</Link>
          </article>
        </li>
        <li aria-hidden="true" className="sense-flow-connection">→</li>
        <li>
          <article>
            <h2>Terra Insight</h2>
            <p>{summary.approvedEvents} approved event{summary.approvedEvents === 1 ? "" : "s"} available for analysis.</p>
            <p>Only approved events enter Terra Insight.</p>
            <Link href="/dashboard">Open Terra Insight</Link>
          </article>
        </li>
      </ol>
    </div>
  );
}
