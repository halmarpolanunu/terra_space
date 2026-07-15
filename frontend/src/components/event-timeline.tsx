import Link from "next/link";

import type { EventRead } from "@/lib/events-api";
import type { EventSort } from "@/lib/event-filters";

type EventTimelineProps = {
  events: EventRead[];
  sort: EventSort;
  hasActiveFilters: boolean;
  limit?: number;
  onClearFilters?: () => void;
  onSelect?: (event: EventRead) => void;
};

function isKnownDate(event: EventRead): event is EventRead & { start_date: string } {
  return Boolean(event.start_date && event.start_date_precision !== "unknown");
}

export function EventTimeline({ events, sort, hasActiveFilters, limit, onClearFilters, onSelect }: EventTimelineProps) {
  const knownEvents = events.filter(isKnownDate).sort((left, right) => {
    const comparison = left.start_date.localeCompare(right.start_date);
    return sort === "date_asc" ? comparison : -comparison;
  });
  const unknownEvents = events
    .filter((event) => !isKnownDate(event))
    .sort((left, right) => left.title.localeCompare(right.title));
  const orderedEvents = [...knownEvents, ...unknownEvents];
  const visibleEvents = limit === undefined ? orderedEvents : orderedEvents.slice(0, limit);
  const visibleKnownEvents = visibleEvents.filter(isKnownDate);
  const visibleUnknownEvents = visibleEvents.filter((event) => !isKnownDate(event));

  function renderEvent(event: EventRead) {
    return (
      <li key={event.id}>
        {onSelect ? (
          <button className="timeline-event-trigger" onClick={() => onSelect(event)} type="button">
            {event.title}
          </button>
        ) : event.title}
      </li>
    );
  }

  if (events.length === 0) {
    return hasActiveFilters ? (
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
    );
  }

  return (
    <div className="event-timeline">
      {visibleKnownEvents.length > 0 && (
        <section className="timeline-group">
          <h3>Known dates</h3>
          <ul>{visibleKnownEvents.map(renderEvent)}</ul>
        </section>
      )}
      {visibleUnknownEvents.length > 0 && (
        <section className="timeline-group timeline-unknown-group">
          <h3>Date unknown</h3>
          <ul>{visibleUnknownEvents.map(renderEvent)}</ul>
        </section>
      )}
    </div>
  );
}
