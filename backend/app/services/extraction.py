from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import (
    Actor,
    Document,
    Event,
    EventActor,
    EventSource,
    EventType,
    Location,
)
from app.schemas.extraction import ExtractedEvent, ExtractedLocation, ExtractionResult
from app.services.duplicates import detect_duplicates
from app.services.matching import find_by_exact_name, get_or_create_document_source, quote_found
from app.services.locations import apply_coordinates


@dataclass
class DroppedEvent:
    title: str
    reason: str


@dataclass
class DroppedLocation:
    event_title: str
    reason: str


@dataclass
class PersistResult:
    saved_events: list[Event] = field(default_factory=list)
    dropped_events: list[DroppedEvent] = field(default_factory=list)
    dropped_locations: list[DroppedLocation] = field(default_factory=list)


def _validate_event(event_data: ExtractedEvent, document_content: str) -> str | None:
    if not event_data.title.strip():
        return "Missing title."
    if not event_data.summary.strip():
        return "Missing summary."
    if not quote_found(event_data.evidence_quote, document_content):
        return "Evidence quote not found in the source document."
    return None


def _location_grounded(location_data: ExtractedLocation, evidence_quote: str) -> bool:
    named_fields = [value for value in (location_data.admin1, location_data.city_regency) if value]
    if not named_fields:
        return True
    return any(quote_found(value, evidence_quote) for value in named_fields)


def persist_extraction(
    db: Session, document: Document, extraction_result: ExtractionResult
) -> PersistResult:
    result = PersistResult()
    source = get_or_create_document_source(db, document)

    existing_event_types = list(db.execute(select(EventType)).scalars())
    existing_actors = list(db.execute(select(Actor)).scalars())

    for event_data in extraction_result.events:
        reason = _validate_event(event_data, document.content)
        if reason is not None:
            result.dropped_events.append(DroppedEvent(title=event_data.title, reason=reason))
            continue

        type_name = event_data.event_type.existing or event_data.event_type.suggested
        event_type = None
        if type_name:
            event_type = find_by_exact_name(existing_event_types, type_name)
            if event_type is None:
                suggested_description = (
                    (event_data.event_type.suggested_description or "").strip() or None
                    if event_data.event_type.suggested
                    else None
                )
                event_type = EventType(
                    name=type_name,
                    description=suggested_description,
                    is_active=False,
                )
                db.add(event_type)
                existing_event_types.append(event_type)

        event = Event(
            title=event_data.title,
            summary=event_data.summary,
            start_date=event_data.start_date,
            start_date_precision=event_data.start_date_precision,
            end_date=event_data.end_date,
            end_date_precision=event_data.end_date_precision,
            epistemic_status=event_data.epistemic_status,
            review_status="draft",
            event_type=event_type,
        )
        db.add(event)

        event.event_sources.append(
            EventSource(source=source, evidence_quote=event_data.evidence_quote)
        )

        for location_data in event_data.locations:
            if not (location_data.country or location_data.admin1 or location_data.city_regency):
                continue
            if not _location_grounded(location_data, event_data.evidence_quote):
                result.dropped_locations.append(
                    DroppedLocation(
                        event_title=event_data.title,
                        reason="Location text not found in the event's evidence quote.",
                    )
                )
                continue
            location = Location(
                country=location_data.country,
                admin1=location_data.admin1,
                city_regency=location_data.city_regency,
            )
            apply_coordinates(location)
            event.locations.append(location)

        for actor_data in event_data.actors:
            actor = find_by_exact_name(existing_actors, actor_data.name)
            if actor is None:
                actor = Actor(name=actor_data.name, is_active=False)
                db.add(actor)
                existing_actors.append(actor)
            event.event_actors.append(EventActor(actor=actor, role=actor_data.role))

        detect_duplicates(db, event)
        result.saved_events.append(event)

    db.commit()
    return result
