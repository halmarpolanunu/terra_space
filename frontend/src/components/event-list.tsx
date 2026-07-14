import { StatusChip } from "@/components/status-chip";
import type { EventRead, LocationRead } from "@/lib/events-api";

type EventListProps = {
  events: EventRead[];
  onSelect: (event: EventRead) => void;
};

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

export function EventList({ events, onSelect }: EventListProps) {
  if (events.length === 0) {
    return <p className="event-empty-state">No events match these filters.</p>;
  }

  return (
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
          </li>
        );
      })}
    </ul>
  );
}
