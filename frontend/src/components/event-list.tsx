import Link from "next/link";

import { StatusChip } from "@/components/status-chip";
import { EVENT_SORT_OPTIONS, type EventSort } from "@/lib/event-filters";
import type { EventRead, LocationRead } from "@/lib/events-api";

type EventListProps = {
  events: EventRead[];
  onSelect: (event: EventRead) => void;
  onDelete?: (event: EventRead) => void;
  sort: EventSort;
  onSortChange: (sort: EventSort) => void;
  hasActiveFilters: boolean;
  onClearFilters?: () => void;
};

function isDeletable(event: EventRead): boolean {
  return event.review_status === "draft" || event.review_status === "approved";
}

const EPISTEMIC_LABELS = {
  confirmed: "Confirmed",
  claim: "Claim",
  rumor: "Rumor",
  denied: "Denied",
} as const;

const EPISTEMIC_COLORS = {
  confirmed: "--status-confirmed",
  claim: "--status-claim",
  rumor: "--status-rumor",
  denied: "--status-denied",
} as const;

function formatLocation(location: LocationRead): string {
  return [location.city_regency, location.admin1, location.country].filter(Boolean).join(", ");
}

function formatDate(event: EventRead): string {
  if (!event.start_date || event.start_date_precision === "unknown") {
    return "Date unknown";
  }
  return event.start_date_precision && event.start_date_precision !== "exact"
    ? `${event.start_date} (${event.start_date_precision})`
    : event.start_date;
}

export function EventList({
  events,
  onSelect,
  onDelete,
  sort,
  onSortChange,
  hasActiveFilters,
  onClearFilters,
}: EventListProps) {
  return (
    <div className="event-list-panel">
      <div className="event-list-toolbar">
        <p className="event-list-count">
          {events.length} approved event{events.length === 1 ? "" : "s"}
        </p>
        <div className="field event-list-sort">
          <label htmlFor="event-list-sort">Sort order</label>
          <select
            id="event-list-sort"
            onChange={(changeEvent) => onSortChange(changeEvent.target.value as EventSort)}
            value={sort}
          >
            {EVENT_SORT_OPTIONS.map(([optionValue, label], index) => (
              <option key={`${optionValue}-${index}`} value={optionValue}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {events.length === 0 ? (
        hasActiveFilters ? (
          <div className="event-empty-state">
            <p>No events match these filters.</p>
            {onClearFilters && (
              <button className="btn" onClick={onClearFilters} type="button">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="event-empty-state">
            <p>No approved events yet.</p>
            <Link className="btn" href="/event-review">
              Approve extracted events in Event Review
            </Link>
          </div>
        )
      ) : (
        <>
          <div className="event-list-header">
            <span>Title</span>
            <span>Status</span>
            <span>Type</span>
            <span>Date</span>
            <span>Location</span>
            <span>Sources</span>
            <span>Actions</span>
          </div>
          <ul className="event-list">
            {events.map((event) => {
              const location = event.locations.map(formatLocation).filter(Boolean).join("; ") || "Not stated";
              const sourceLabel = `${event.sources.length} ${event.sources.length === 1 ? "source" : "sources"}`;
              return (
                <li className="event-list-row" key={event.id}>
                  <button className="event-list-title" onClick={() => onSelect(event)} type="button">
                    {event.title}
                  </button>
                  <StatusChip
                    colorVar={EPISTEMIC_COLORS[event.epistemic_status]}
                    label={EPISTEMIC_LABELS[event.epistemic_status]}
                    value={event.epistemic_status}
                  />
                  <span className="event-list-meta">{event.event_type?.name ?? "Uncategorized"}</span>
                  <span className="event-list-meta">{formatDate(event)}</span>
                  <span className="event-list-meta">{location}</span>
                  <span className="event-list-meta event-source-count">{sourceLabel}</span>
                  <span className="event-list-row-actions">
                    {onDelete && isDeletable(event) && (
                      <button className="btn btn-destructive" onClick={() => onDelete(event)} type="button">
                        Delete
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
