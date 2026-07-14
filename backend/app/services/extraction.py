import re
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
    Source,
)
from app.schemas.extraction import ExtractedEvent, ExtractionResult


@dataclass
class DroppedEvent:
    title: str
    reason: str


@dataclass
class PersistResult:
    saved_events: list[Event] = field(default_factory=list)
    dropped_events: list[DroppedEvent] = field(default_factory=list)


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().casefold()


def _quote_found(quote: str, document_content: str) -> bool:
    normalized_quote = _normalize(quote)
    if not normalized_quote:
        return False
    return normalized_quote in _normalize(document_content)


def _validate_event(event_data: ExtractedEvent, document_content: str) -> str | None:
    if not event_data.title.strip():
        return "Missing title."
    if not event_data.summary.strip():
        return "Missing summary."
    if not _quote_found(event_data.evidence_quote, document_content):
        return "Evidence quote not found in the source document."
    return None


def _find_by_exact_name(candidates: list, name: str):
    target = name.strip().casefold()
    for candidate in candidates:
        if candidate.name.strip().casefold() == target:
            return candidate
    return None


def _get_or_create_document_source(db: Session, document: Document) -> Source:
    existing = db.execute(
        select(Source).where(Source.document_id == document.id)
    ).scalar_one_or_none()
    if existing is not None:
        return existing
    source = Source(document=document, reference_label=document.title)
    db.add(source)
    db.flush()
    return source


def persist_extraction(
    db: Session, document: Document, extraction_result: ExtractionResult
) -> PersistResult:
    result = PersistResult()
    source = _get_or_create_document_source(db, document)

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
            event_type = _find_by_exact_name(existing_event_types, type_name)
            if event_type is None:
                event_type = EventType(name=type_name, is_active=False)
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
            if location_data.country or location_data.admin1 or location_data.city_regency:
                event.locations.append(
                    Location(
                        country=location_data.country,
                        admin1=location_data.admin1,
                        city_regency=location_data.city_regency,
                    )
                )

        for actor_data in event_data.actors:
            actor = _find_by_exact_name(existing_actors, actor_data.name)
            if actor is None:
                actor = Actor(name=actor_data.name, is_active=False)
                db.add(actor)
                existing_actors.append(actor)
            event.event_actors.append(EventActor(actor=actor, role=actor_data.role))

        result.saved_events.append(event)

    db.commit()
    return result
