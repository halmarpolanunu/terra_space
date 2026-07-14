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
from app.schemas.event import (
    ActorRead,
    DuplicateFlagRead,
    EventActorRead,
    EventCreate,
    EventRead,
    EventSourceRead,
    EventTypeInput,
    EventTypeRead,
    EventUpdate,
    LocationRead,
)
from app.services.duplicates import detect_duplicates
from app.services.matching import find_by_exact_name, get_or_create_document_source, quote_found

EDITABLE_REVIEW_STATUSES = {"draft"}


class EventEditNotAllowedError(Exception):
    """Raised when editing, approving, or rejecting an event outside of review_status draft."""

    def __init__(self, review_status: str) -> None:
        self.review_status = review_status
        super().__init__(f"Event cannot be edited while {review_status}.")


class PendingDuplicateFlagError(Exception):
    """Raised when approving an event that still has an unresolved duplicate flag."""

    def __init__(self, pending_count: int) -> None:
        self.pending_count = pending_count
        super().__init__(f"Event has {pending_count} unresolved duplicate flag(s).")


class EvidenceQuoteNotFoundError(Exception):
    """Raised when a manually added event's evidence quote is not in the document's content."""


def to_event_read(event: Event) -> EventRead:
    return EventRead(
        id=event.id,
        title=event.title,
        summary=event.summary,
        start_date=event.start_date,
        start_date_precision=event.start_date_precision,
        end_date=event.end_date,
        end_date_precision=event.end_date_precision,
        epistemic_status=event.epistemic_status,
        review_status=event.review_status,
        event_type=EventTypeRead.model_validate(event.event_type) if event.event_type else None,
        actors=[
            EventActorRead(role=event_actor.role, actor=ActorRead.model_validate(event_actor.actor))
            for event_actor in event.event_actors
        ],
        locations=[LocationRead.model_validate(location) for location in event.locations],
        sources=[
            EventSourceRead(
                source_id=event_source.source_id,
                document_id=event_source.source.document_id,
                reference_label=event_source.source.reference_label,
                evidence_quote=event_source.evidence_quote,
            )
            for event_source in event.event_sources
        ],
        duplicate_flags=[
            DuplicateFlagRead.model_validate(flag) for flag in event.duplicate_flags
        ],
        created_at=event.created_at,
        updated_at=event.updated_at,
    )


def list_events(db: Session, review_status: str | None) -> list[Event]:
    query = select(Event)
    if review_status is not None:
        query = query.where(Event.review_status == review_status)
    query = query.order_by(Event.created_at.desc())
    return list(db.execute(query).scalars())


def list_events_for_document(db: Session, document_id: str) -> list[Event]:
    query = (
        select(Event)
        .join(EventSource, EventSource.event_id == Event.id)
        .join(Source, Source.id == EventSource.source_id)
        .where(Source.document_id == document_id)
        .order_by(Event.created_at)
        .distinct()
    )
    return list(db.execute(query).scalars())


def get_event(db: Session, event_id: str) -> Event | None:
    return db.get(Event, event_id)


def _resolve_event_type(db: Session, type_input: EventTypeInput) -> EventType | None:
    type_name = type_input.existing or type_input.suggested
    if not type_name:
        return None
    existing_types = list(db.execute(select(EventType)).scalars())
    event_type = find_by_exact_name(existing_types, type_name)
    if event_type is None:
        event_type = EventType(name=type_name, is_active=False)
        db.add(event_type)
    return event_type


def _resolve_actor(db: Session, name: str) -> Actor:
    existing_actors = list(db.execute(select(Actor)).scalars())
    actor = find_by_exact_name(existing_actors, name)
    if actor is None:
        actor = Actor(name=name, is_active=False)
        db.add(actor)
    return actor


def _document_ids_for_event(event: Event) -> set[str]:
    return {
        event_source.source.document_id
        for event_source in event.event_sources
        if event_source.source.document_id is not None
    }


def _complete_documents_with_no_drafts_remaining(db: Session, document_ids: set[str]) -> None:
    for document_id in document_ids:
        document = db.get(Document, document_id)
        if document is None or document.processing_status != "ready_for_review":
            continue
        remaining = db.execute(
            select(Event.id)
            .join(EventSource, EventSource.event_id == Event.id)
            .join(Source, Source.id == EventSource.source_id)
            .where(Source.document_id == document_id, Event.review_status == "draft")
            .limit(1)
        ).first()
        if remaining is None:
            document.processing_status = "completed"


def update_event(db: Session, event: Event, payload: EventUpdate) -> Event:
    if event.review_status not in EDITABLE_REVIEW_STATUSES:
        raise EventEditNotAllowedError(event.review_status)

    data = payload.model_dump(exclude_unset=True, exclude={"event_type", "actors", "locations"})
    for field_name, value in data.items():
        setattr(event, field_name, value)

    if payload.event_type is not None:
        event.event_type = _resolve_event_type(db, payload.event_type)

    if payload.actors is not None:
        event.event_actors.clear()
        for actor_input in payload.actors:
            actor = _resolve_actor(db, actor_input.name)
            event.event_actors.append(EventActor(actor=actor, role=actor_input.role))

    if payload.locations is not None:
        event.locations = [
            Location(
                country=location.country,
                admin1=location.admin1,
                city_regency=location.city_regency,
            )
            for location in payload.locations
            if location.country or location.admin1 or location.city_regency
        ]

    db.commit()
    db.refresh(event)
    return event


def approve_event(db: Session, event: Event) -> Event:
    if event.review_status not in EDITABLE_REVIEW_STATUSES:
        raise EventEditNotAllowedError(event.review_status)

    pending = [flag for flag in event.duplicate_flags if flag.resolution == "pending"]
    if pending:
        raise PendingDuplicateFlagError(len(pending))

    event.review_status = "approved"
    if event.event_type is not None and not event.event_type.is_active:
        event.event_type.is_active = True
    for event_actor in event.event_actors:
        if not event_actor.actor.is_active:
            event_actor.actor.is_active = True

    _complete_documents_with_no_drafts_remaining(db, _document_ids_for_event(event))

    db.commit()
    db.refresh(event)
    return event


def reject_event(db: Session, event: Event) -> Event:
    if event.review_status not in EDITABLE_REVIEW_STATUSES:
        raise EventEditNotAllowedError(event.review_status)

    event.review_status = "rejected"
    _complete_documents_with_no_drafts_remaining(db, _document_ids_for_event(event))

    db.commit()
    db.refresh(event)
    return event


@dataclass
class ApproveAllSkip:
    event_id: str
    reason: str


@dataclass
class ApproveAllResult:
    approved_event_ids: list[str] = field(default_factory=list)
    skipped: list[ApproveAllSkip] = field(default_factory=list)


def approve_all_for_document(db: Session, document_id: str) -> ApproveAllResult:
    result = ApproveAllResult()
    for event in list_events_for_document(db, document_id):
        if event.review_status != "draft":
            continue
        try:
            approve_event(db, event)
            result.approved_event_ids.append(event.id)
        except PendingDuplicateFlagError:
            result.skipped.append(
                ApproveAllSkip(event_id=event.id, reason="Has a pending duplicate flag.")
            )
    return result


def create_manual_event(db: Session, document: Document, payload: EventCreate) -> Event:
    if not quote_found(payload.evidence_quote, document.content):
        raise EvidenceQuoteNotFoundError(
            "Evidence quote not found in the source document."
        )

    source = get_or_create_document_source(db, document)
    event_type = _resolve_event_type(db, payload.event_type) if payload.event_type else None

    event = Event(
        title=payload.title,
        summary=payload.summary,
        start_date=payload.start_date,
        start_date_precision=payload.start_date_precision,
        end_date=payload.end_date,
        end_date_precision=payload.end_date_precision,
        epistemic_status=payload.epistemic_status,
        review_status="draft",
        event_type=event_type,
    )
    db.add(event)

    event.event_sources.append(
        EventSource(source=source, evidence_quote=payload.evidence_quote)
    )

    for location in payload.locations:
        if location.country or location.admin1 or location.city_regency:
            event.locations.append(
                Location(
                    country=location.country,
                    admin1=location.admin1,
                    city_regency=location.city_regency,
                )
            )

    for actor_input in payload.actors:
        actor = _resolve_actor(db, actor_input.name)
        event.event_actors.append(EventActor(actor=actor, role=actor_input.role))

    detect_duplicates(db, event)
    db.commit()
    db.refresh(event)
    return event
