import { formatTaxonomyPath, type EventTypeRead } from "@/lib/events-api";

type Props = {
  eventType?: EventTypeRead;
  needsSelection?: boolean;
};

export function EventTypeDescription({ eventType, needsSelection = false }: Props) {
  const path = eventType?.taxonomy_path;
  const pathLine = path && path.length > 0 && (
    <p className="event-type-path">{formatTaxonomyPath(path)}</p>
  );

  if (eventType?.description) {
    return (
      <>
        <p className="event-type-description">{eventType.description}</p>
        {pathLine}
      </>
    );
  }
  if (needsSelection) {
    return (
      <p className="event-type-description event-type-description-required">
        Select an active Event Type during review if appropriate.
      </p>
    );
  }
  return pathLine ?? null;
}

export function eventTypeNeedsDescription(eventType?: EventTypeRead | null): boolean {
  return Boolean(eventType && !eventType.is_active && !eventType.description?.trim());
}
