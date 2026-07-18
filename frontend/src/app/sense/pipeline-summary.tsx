import type { Document } from "@/lib/documents-api";
import type { EventRead } from "@/lib/events-api";

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
    pendingDuplicates: draftEvents.filter((event) =>
      event.duplicate_flags.some((flag) => flag.resolution === "pending"),
    ).length,
    approvedEvents: approvedEvents.length,
  };
}
