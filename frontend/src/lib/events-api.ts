import { toEventFilterSearch, type EventFilters } from "@/lib/event-filters";

export type EpistemicStatus = "confirmed" | "claim" | "rumor" | "denied";
export type DatePrecision = "exact" | "month" | "year" | "unknown";
export type ReviewStatus = "draft" | "approved" | "rejected" | "merged";
export type ActorRole = "source" | "target";
export type DuplicateResolution = "pending" | "kept_separate" | "linked";

export type EventTypeRead = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  in_use?: boolean;
};

export type ActorRead = {
  id: string;
  name: string;
  is_active: boolean;
};

export type EventActorRead = {
  role: ActorRole;
  actor: ActorRead;
};

export type LocationRead = {
  id: string;
  country: string | null;
  admin1: string | null;
  city_regency: string | null;
  latitude: number | null;
  longitude: number | null;
  coordinate_precision?: "country" | "admin1" | "city_regency" | null;
};

export type EventSourceRead = {
  source_id: string;
  document_id: string | null;
  reference_label: string;
  evidence_quote: string | null;
};

export type DuplicateFlagRead = {
  id: string;
  matched_event_id: string;
  matched_reason: string;
  resolution: DuplicateResolution;
  resolved_at: string | null;
};

export type EventRead = {
  id: string;
  title: string;
  summary: string;
  start_date: string | null;
  start_date_precision: DatePrecision | null;
  end_date: string | null;
  end_date_precision: DatePrecision | null;
  epistemic_status: EpistemicStatus;
  review_status: ReviewStatus;
  event_type: EventTypeRead | null;
  actors: EventActorRead[];
  locations: LocationRead[];
  sources: EventSourceRead[];
  duplicate_flags: DuplicateFlagRead[];
  created_at: string;
  updated_at: string;
  approved_at?: string | null;
};

export type DashboardSummaryRead = {
  total_events: number;
  new_events: number;
  by_event_type: { name: string; count: number }[];
  incomplete_date_count: number;
  incomplete_location_count: number;
};

export type EventTypeInput = {
  existing?: string | null;
  suggested?: string | null;
};

export type ActorInput = {
  name: string;
  role: ActorRole;
};

export type LocationInput = {
  country?: string | null;
  admin1?: string | null;
  city_regency?: string | null;
};

export type EventCreate = {
  document_id: string;
  evidence_quote: string;
  title: string;
  summary: string;
  event_type?: EventTypeInput | null;
  start_date?: string | null;
  start_date_precision?: DatePrecision | null;
  end_date?: string | null;
  end_date_precision?: DatePrecision | null;
  epistemic_status: EpistemicStatus;
  locations?: LocationInput[];
  actors?: ActorInput[];
};

export type EventUpdate = Partial<{
  title: string;
  summary: string;
  event_type: EventTypeInput;
  start_date: string | null;
  start_date_precision: DatePrecision | null;
  end_date: string | null;
  end_date_precision: DatePrecision | null;
  epistemic_status: EpistemicStatus;
  locations: LocationInput[];
  actors: ActorInput[];
}>;

export type ApproveAllResponse = {
  approved_event_ids: string[];
  skipped: { event_id: string; reason: string }[];
};

const API_ROOT = "/api/backend/api";

async function parseOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function listEventsForDocument(documentId: string): Promise<EventRead[]> {
  const response = await fetch(`${API_ROOT}/documents/${documentId}/events`);
  return parseOrThrow<EventRead[]>(response);
}

export async function listEvents(filters: EventFilters): Promise<EventRead[]> {
  const params = new URLSearchParams(toEventFilterSearch(filters));
  params.set("review_status", "approved");
  const search = params.toString();
  const response = await fetch(`${API_ROOT}/events${search ? `?${search}` : ""}`);
  return parseOrThrow<EventRead[]>(response);
}

export async function listEventsByReviewStatus(
  reviewStatus: ReviewStatus,
): Promise<EventRead[]> {
  const response = await fetch(`${API_ROOT}/events?review_status=${reviewStatus}`);
  return parseOrThrow<EventRead[]>(response);
}

export async function getDashboardSummary(filters: EventFilters): Promise<DashboardSummaryRead> {
  const search = toEventFilterSearch(filters);
  const response = await fetch(
    `${API_ROOT}/events/dashboard-summary${search ? `?${search}` : ""}`,
  );
  return parseOrThrow<DashboardSummaryRead>(response);
}

export async function getEvent(eventId: string): Promise<EventRead> {
  const response = await fetch(`${API_ROOT}/events/${eventId}`);
  return parseOrThrow<EventRead>(response);
}

export async function createManualEvent(payload: EventCreate): Promise<EventRead> {
  const response = await fetch(`${API_ROOT}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseOrThrow<EventRead>(response);
}

export async function updateEvent(eventId: string, patch: EventUpdate): Promise<EventRead> {
  const response = await fetch(`${API_ROOT}/events/${eventId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return parseOrThrow<EventRead>(response);
}

export async function approveEvent(eventId: string): Promise<EventRead> {
  const response = await fetch(`${API_ROOT}/events/${eventId}/approve`, { method: "POST" });
  return parseOrThrow<EventRead>(response);
}

export async function rejectEvent(eventId: string): Promise<EventRead> {
  const response = await fetch(`${API_ROOT}/events/${eventId}/reject`, { method: "POST" });
  return parseOrThrow<EventRead>(response);
}

export async function deleteEvent(eventId: string): Promise<void> {
  const response = await fetch(`${API_ROOT}/events/${eventId}`, { method: "DELETE" });
  if (!response.ok) await parseOrThrow<never>(response);
}

export async function approveAllForDocument(documentId: string): Promise<ApproveAllResponse> {
  const response = await fetch(`${API_ROOT}/documents/${documentId}/events/approve-all`, {
    method: "POST",
  });
  return parseOrThrow<ApproveAllResponse>(response);
}

export async function resolveDuplicateFlag(
  eventId: string,
  flagId: string,
  resolution: DuplicateResolution,
): Promise<EventRead> {
  const response = await fetch(
    `${API_ROOT}/events/${eventId}/duplicate-flags/${flagId}/resolve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolution }),
    },
  );
  return parseOrThrow<EventRead>(response);
}

export async function listEventTypes(): Promise<EventTypeRead[]> {
  const response = await fetch(`${API_ROOT}/event-types`);
  return parseOrThrow<EventTypeRead[]>(response);
}

export async function listActors(): Promise<ActorRead[]> {
  const response = await fetch(`${API_ROOT}/actors`);
  return parseOrThrow<ActorRead[]>(response);
}
