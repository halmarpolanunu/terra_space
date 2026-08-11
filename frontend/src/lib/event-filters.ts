export type EventSort = "" | "date_desc" | "date_asc" | "created_desc" | "title_asc";

export const EVENT_SORT_OPTIONS: [EventSort, string][] = [
  ["", "Date (newest first)"],
  ["date_desc", "Date (newest first)"],
  ["date_asc", "Date (oldest first)"],
  ["created_desc", "Recently created"],
  ["title_asc", "Title (A–Z)"],
];

// Manual visibility filter (see decisions/Automatic-Event-Visibility-With-Manual-Filtering.md).
// "" means "all processed events" (published + hidden), the default.
export type DashboardStatusFilter = "" | "published" | "hidden";

export type EventFilters = {
  q: string;
  date_from: string;
  date_to: string;
  event_type_id: string;
  epistemic_status: string;
  actor_id: string;
  country: string;
  admin1: string;
  city_regency: string;
  document_id: string;
  dashboard_status: DashboardStatusFilter;
  sort: EventSort;
};

const FILTER_KEYS: (keyof EventFilters)[] = [
  "q",
  "date_from",
  "date_to",
  "event_type_id",
  "epistemic_status",
  "actor_id",
  "country",
  "admin1",
  "city_regency",
  "document_id",
  "dashboard_status",
  "sort",
];

export const ACTIVE_FILTER_KEYS: Exclude<keyof EventFilters, "sort">[] = [
  "q",
  "date_from",
  "date_to",
  "event_type_id",
  "epistemic_status",
  "actor_id",
  "country",
  "admin1",
  "city_regency",
  "document_id",
  "dashboard_status",
];

const SORT_VALUES = new Set<EventSort>(["", "date_desc", "date_asc", "created_desc", "title_asc"]);
const DASHBOARD_STATUS_VALUES = new Set<DashboardStatusFilter>(["", "published", "hidden"]);

export function emptyEventFilters(): EventFilters {
  return {
    q: "",
    date_from: "",
    date_to: "",
    event_type_id: "",
    epistemic_status: "",
    actor_id: "",
    country: "",
    admin1: "",
    city_regency: "",
    document_id: "",
    dashboard_status: "",
    sort: "",
  };
}

export function clearEventFilters(filters: EventFilters): EventFilters {
  return { ...emptyEventFilters(), sort: filters.sort };
}

export function parseEventFilters(search: string | URLSearchParams): EventFilters {
  const params = new URLSearchParams(search);
  const filters = emptyEventFilters();

  for (const key of FILTER_KEYS) {
    const value = params.get(key)?.trim() ?? "";
    if (key === "sort") {
      filters.sort = SORT_VALUES.has(value as EventSort) ? (value as EventSort) : "";
    } else if (key === "dashboard_status") {
      filters.dashboard_status = DASHBOARD_STATUS_VALUES.has(value as DashboardStatusFilter)
        ? (value as DashboardStatusFilter)
        : "";
    } else {
      filters[key] = value;
    }
  }

  return filters;
}

export function toEventFilterSearch(filters: EventFilters): string {
  const params = new URLSearchParams();

  for (const key of FILTER_KEYS) {
    const value = filters[key].trim();
    if (value) {
      params.set(key, value);
    }
  }

  return params.toString();
}

export function hasActiveEventFilters(filters: EventFilters): boolean {
  return ACTIVE_FILTER_KEYS.some((key) => Boolean(filters[key].trim()));
}
