from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Event, EventSource, Source
from app.schemas.event import (
    ActorRead,
    DuplicateFlagRead,
    EventActorRead,
    EventRead,
    EventSourceRead,
    EventTypeRead,
    LocationRead,
)


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
