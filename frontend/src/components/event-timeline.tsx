import type { EventRead } from "@/lib/events-api";
import type { EventSort } from "@/lib/event-filters";

type EventTimelineProps = {
  events: EventRead[];
  sort: EventSort;
};

function isKnownDate(event: EventRead): event is EventRead & { start_date: string } {
  return Boolean(event.start_date && event.start_date_precision !== "unknown");
}

export function EventTimeline({ events, sort }: EventTimelineProps) {
  const knownEvents = events.filter(isKnownDate).sort((left, right) => {
    const comparison = left.start_date.localeCompare(right.start_date);
    return sort === "date_asc" ? comparison : -comparison;
  });
  const unknownEvents = events.filter((event) => !isKnownDate(event));

  if (events.length === 0) {
    return <p className="event-empty-state">No events match these filters.</p>;
  }

  return (
    <div className="event-timeline">
      {knownEvents.length > 0 && (
        <section className="timeline-group">
          <h2>Known dates</h2>
          <ul>{knownEvents.map((event) => <li key={event.id}>{event.title}</li>)}</ul>
        </section>
      )}
      {unknownEvents.length > 0 && (
        <section className="timeline-group timeline-unknown-group">
          <h2>Date unknown</h2>
          <ul>{unknownEvents.map((event) => <li key={event.id}>{event.title}</li>)}</ul>
        </section>
      )}
    </div>
  );
}
