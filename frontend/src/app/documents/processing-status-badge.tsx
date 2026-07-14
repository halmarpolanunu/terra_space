import { StatusChip } from "@/components/status-chip";
import type { ProcessingStatus } from "@/lib/documents-api";

const LABELS: Record<ProcessingStatus, string> = {
  draft: "Draft",
  queued: "Queued",
  processing: "Processing",
  ready_for_review: "Ready for review",
  completed: "Completed",
  failed: "Failed",
};

const COLOR_VARS: Partial<Record<ProcessingStatus, string>> = {
  queued: "--status-rumor",
  processing: "--status-rumor",
  ready_for_review: "--status-claim",
  completed: "--status-confirmed",
  failed: "--status-denied",
};

type ProcessingStatusBadgeProps = { status: ProcessingStatus };

export function ProcessingStatusBadge({ status }: ProcessingStatusBadgeProps) {
  return <StatusChip colorVar={COLOR_VARS[status]} label={LABELS[status]} value={status} />;
}
