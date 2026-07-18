import type { EventTypeRead } from "@/lib/events-api";

type Props = {
  eventType?: EventTypeRead;
  needsSelection?: boolean;
};

export function EventTypeDescription({ eventType, needsSelection = false }: Props) {
  if (eventType?.description) {
    return <p className="event-type-description">{eventType.description}</p>;
  }
  if (needsSelection) {
    return (
      <p className="event-type-description event-type-description-required">
        Select an active Event Type during review if appropriate.
      </p>
    );
  }
  return null;
}

export function eventTypeNeedsDescription(eventType?: EventTypeRead | null): boolean {
  return Boolean(eventType && !eventType.is_active && !eventType.description?.trim());
}
