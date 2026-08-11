import { toEventFilterSearch, type EventFilters } from "@/lib/event-filters";

// The canonical set phase3_events' own CHECK constraint enforces (see
// decisions/Fresh-Phase-Prefixed-Supabase-Architecture.md). "claim"/"rumor" -- the old SQLite-only
// values -- were dropped once SQLite stopped being a write target for events.
export type EpistemicStatus = "confirmed" | "reported" | "alleged" | "planned" | "denied" | "unknown";
export type DatePrecision = "exact" | "month" | "year" | "unknown";
export type ActorRole = "source" | "target";
export type DuplicateResolution = "pending" | "kept_separate" | "linked";

export type TaxonomyLevel = "domain" | "category" | "subcategory" | "event_type";

export type TaxonomyPathSegment = {
  id: string;
  name: string;
  level: TaxonomyLevel;
};

export type EventTypeRead = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  in_use?: boolean;
  taxonomy_path?: TaxonomyPathSegment[];
};

export type TaxonomyNodeRead = {
  id: string;
  name: string;
  level: TaxonomyLevel;
  parent_id: string | null;
  event_type: EventTypeRead | null;
  children: TaxonomyNodeRead[];
};

export function isFullTaxonomyLeaf(eventType: EventTypeRead): boolean {
  return (
    eventType.is_active &&
    (eventType.taxonomy_path?.length ?? 0) === 4 &&
    eventType.taxonomy_path![3].level === "event_type"
  );
}

export function formatTaxonomyPath(path: TaxonomyPathSegment[]): string {
  return path.map((segment) => segment.name).join(" › ");
}

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

// Replaces the old "ReviewStatus" (draft/approved/rejected/merged) entirely -- see
// decisions/Fresh-Phase-Prefixed-Supabase-Architecture.md and
// decisions/Automatic-Event-Visibility-With-Manual-Filtering.md.
export type Origin = "pipeline" | "manual";
export type PipelineOutcome = "FINAL" | "EXCEPTION";
export type DashboardStatus = "published" | "hidden" | "rejected" | "archived" | "merged";

export type EventRead = {
  id: string;
  title: string;
  summary: string;
  event_date: string | null;
  event_date_precision: DatePrecision | null;
  epistemic_status: EpistemicStatus;
  event_type: EventTypeRead | null;
  actors: EventActorRead[];
  locations: LocationRead[];
  sources: EventSourceRead[];
  duplicate_flags: DuplicateFlagRead[];
  extraction_incomplete: boolean;
  extraction_incomplete_stages: string[];
  created_at: string;
  updated_at: string;
  // Kept as "approved_at" for compatibility -- fed from the real `published_at` column.
  approved_at?: string | null;
  origin?: Origin | null;
  pipeline_outcome?: PipelineOutcome | null;
  dashboard_status?: DashboardStatus | null;
  exception_reason?: string | null;
  human_modified_at?: string | null;
  human_modified_fields?: string[];
};

export function isExceptionEvent(event: EventRead): boolean {
  return event.dashboard_status === "hidden";
}

export type DashboardSummaryRead = {
  total_events: number;
  new_events: number;
  by_event_type: { name: string; count: number }[];
  incomplete_date_count: number;
  incomplete_location_count: number;
  exception_count?: number;
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
  // A Document *is* a Phase 1 source now -- this is that row's id.
  document_id: string;
  evidence_quote: string;
  title: string;
  summary: string;
  event_type?: EventTypeInput | null;
  event_date?: string | null;
  event_date_precision?: DatePrecision | null;
  epistemic_status: EpistemicStatus;
  locations?: LocationInput[];
  actors?: ActorInput[];
};

export type EventUpdate = Partial<{
  title: string;
  summary: string;
  event_type: EventTypeInput;
  event_date: string | null;
  event_date_precision: DatePrecision | null;
  epistemic_status: EpistemicStatus;
  locations: LocationInput[];
  actors: ActorInput[];
}>;

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
  const search = toEventFilterSearch(filters);
  const response = await fetch(`${API_ROOT}/events${search ? `?${search}` : ""}`);
  return parseOrThrow<EventRead[]>(response);
}

/** For Terra Sense's own pipeline summary -- not filtered/sorted, just a plain status count. */
export async function listEventsByDashboardStatus(
  dashboardStatus: DashboardStatus,
): Promise<EventRead[]> {
  const response = await fetch(`${API_ROOT}/events?dashboard_status=${dashboardStatus}`);
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

async function postTransition(eventId: string, action: string): Promise<EventRead> {
  const response = await fetch(`${API_ROOT}/events/${eventId}/${action}`, { method: "POST" });
  return parseOrThrow<EventRead>(response);
}

export async function publishEvent(eventId: string): Promise<EventRead> {
  return postTransition(eventId, "publish");
}

export async function rejectEvent(eventId: string): Promise<EventRead> {
  return postTransition(eventId, "reject");
}

export async function archiveEvent(eventId: string): Promise<EventRead> {
  return postTransition(eventId, "archive");
}

export async function restoreEvent(eventId: string): Promise<EventRead> {
  return postTransition(eventId, "restore");
}

export async function deleteEvent(eventId: string): Promise<void> {
  const response = await fetch(`${API_ROOT}/events/${eventId}`, { method: "DELETE" });
  if (!response.ok) await parseOrThrow<never>(response);
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

export async function listEventTaxonomy(): Promise<TaxonomyNodeRead[]> {
  const response = await fetch(`${API_ROOT}/event-taxonomy`);
  return parseOrThrow<TaxonomyNodeRead[]>(response);
}

export async function listActors(): Promise<ActorRead[]> {
  const response = await fetch(`${API_ROOT}/actors`);
  return parseOrThrow<ActorRead[]>(response);
}
