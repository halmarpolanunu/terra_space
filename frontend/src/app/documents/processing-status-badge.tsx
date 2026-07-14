import type { ProcessingStatus } from "@/lib/documents-api";

const LABELS: Record<ProcessingStatus, string> = {
  draft: "Draft",
  queued: "Queued",
  processing: "Processing",
  ready_for_review: "Ready for review",
  completed: "Completed",
  failed: "Failed",
};

type ProcessingStatusBadgeProps = { status: ProcessingStatus };

export function ProcessingStatusBadge({ status }: ProcessingStatusBadgeProps) {
  return (
    <span className="status-badge" data-status={status}>
      {LABELS[status]}
    </span>
  );
}
