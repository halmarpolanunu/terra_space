import { toEventFilterSearch, type EventFilters } from "@/lib/event-filters";
import type {
  ActorRead,
  DashboardSummaryRead,
  EventRead,
  EventTypeRead,
} from "@/lib/events-api";

export type BridgeMode = {
  configured: boolean;
  read_only: boolean;
  data_source: "supabase";
  message: string;
};

export type BridgeProcessingStatus =
  | "draft"
  | "queued"
  | "processing"
  | "ready_for_review"
  | "completed"
  | "failed";

export type BridgeSource = {
  id: string;
  title: string;
  publication_date: string;
  source_domain: string;
  source_url: string;
  author: string;
  collection_source: string;
  processing_status: BridgeProcessingStatus;
  processing_error: string | null;
  raw_content_text: string;
  cleaned_content_text: string | null;
  created_at: string;
  updated_at: string;
};

export type BridgeMainIssue = {
  label: string | null;
  summary: string | null;
  evidence_quote: string | null;
  evidence_start: number | null;
  evidence_end: number | null;
  quote_grounded: boolean | null;
};

export type BridgeCandidate = {
  working_title: string | null;
  classification: string | null;
  phenomenon: string | null;
  entities: string[];
  evidence_quote: string | null;
  evidence_start: number | null;
  evidence_end: number | null;
  quote_grounded: boolean | null;
};

export type BridgeCandidateReview = {
  phase1_source_id: string;
  source_title: string;
  main_issue_status: "MAIN_ISSUE_FOUND" | "NO_MAIN_ISSUE" | "FAILED";
  main_issue: BridgeMainIssue | null;
  event_detection_status: "EVENT_CANDIDATES_FOUND" | "NO_EVENT_CANDIDATE" | "NOT_RUN" | "FAILED";
  event_candidates: BridgeCandidate[];
  processed_at: string;
};

const API_ROOT = "/api/backend/api/bridge";

async function parseOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function getBridgeMode(): Promise<BridgeMode> {
  const response = await fetch(`${API_ROOT}/mode`);
  return parseOrThrow<BridgeMode>(response);
}

export async function listBridgeSources(): Promise<BridgeSource[]> {
  const response = await fetch(`${API_ROOT}/sources`);
  return parseOrThrow<BridgeSource[]>(response);
}

export async function getBridgeSource(sourceId: string): Promise<BridgeSource> {
  const response = await fetch(`${API_ROOT}/sources/${sourceId}`);
  return parseOrThrow<BridgeSource>(response);
}

export async function listBridgeCandidateReviews(): Promise<BridgeCandidateReview[]> {
  const response = await fetch(`${API_ROOT}/event-candidates`);
  return parseOrThrow<BridgeCandidateReview[]>(response);
}

export async function listBridgeEvents(filters: EventFilters): Promise<EventRead[]> {
  const search = toEventFilterSearch(filters);
  const response = await fetch(`${API_ROOT}/events${search ? `?${search}` : ""}`);
  return parseOrThrow<EventRead[]>(response);
}

export async function getBridgeEvent(eventId: string): Promise<EventRead> {
  const response = await fetch(`${API_ROOT}/events/${eventId}`);
  return parseOrThrow<EventRead>(response);
}

export async function getBridgeDashboardSummary(
  filters: EventFilters,
): Promise<DashboardSummaryRead> {
  const search = toEventFilterSearch(filters);
  const response = await fetch(`${API_ROOT}/events/dashboard-summary${search ? `?${search}` : ""}`);
  return parseOrThrow<DashboardSummaryRead>(response);
}

export async function listBridgeEventTypes(): Promise<EventTypeRead[]> {
  const response = await fetch(`${API_ROOT}/event-types`);
  return parseOrThrow<EventTypeRead[]>(response);
}

export async function listBridgeActors(): Promise<ActorRead[]> {
  const response = await fetch(`${API_ROOT}/actors`);
  return parseOrThrow<ActorRead[]>(response);
}
