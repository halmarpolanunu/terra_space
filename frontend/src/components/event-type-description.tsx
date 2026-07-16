import type { EventTypeRead } from "@/lib/events-api";

type Props = {
  eventType?: EventTypeRead;
  unmatchedName?: string;
};

export function EventTypeDescription({ eventType, unmatchedName }: Props) {
  if (eventType?.description) {
    return <p className="event-type-description">{eventType.description}</p>;
  }
  if (eventType && !eventType.is_active) {
    return (
      <p className="event-type-description event-type-description-required">
        Suggested type — description required before activation.
      </p>
    );
  }
  if (unmatchedName?.trim()) {
    return (
      <p className="event-type-description event-type-description-required">
        New type — add its description in Settings before activation.
      </p>
    );
  }
  return null;
}

export function eventTypeNeedsDescription(eventType?: EventTypeRead | null): boolean {
  return Boolean(eventType && !eventType.is_active && !eventType.description?.trim());
}
