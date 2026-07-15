from dataclasses import dataclass, field
from datetime import UTC, date, datetime, timedelta

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
    utc_now,
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
from app.services.locations import apply_coordinates

EDITABLE_REVIEW_STATUSES = {"draft", "approved"}


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


class EventTypeNameConflictError(Exception):
    """Raised when creating or renaming an event type to a name that already exists."""


class EventTypeInUseError(Exception):
    """Raised when deleting an event type that is still referenced by an event."""


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
        approved_at=event.approved_at,
    )


def list_events(db: Session, review_status: str | None) -> list[Event]:
    query = select(Event)
    if review_status is not None:
        query = query.where(Event.review_status == review_status)
    query = query.order_by(Event.created_at.desc())
    return list(db.execute(query).scalars())


def _event_date_interval(event: Event) -> tuple[date, date] | None:
    if not event.start_date or event.start_date_precision == "unknown":
        return None
    try:
        if event.start_date_precision == "year":
            year = int(event.start_date)
            return date(year, 1, 1), date(year, 12, 31)
        if event.start_date_precision == "month":
            year, month = (int(value) for value in event.start_date.split("-"))
            first = date(year, month, 1)
            next_month = date(year + (month == 12), 1 if month == 12 else month + 1, 1)
            return first, next_month - timedelta(days=1)
        parsed = date.fromisoformat(event.start_date)
        return parsed, parsed
    except ValueError:
        return None


def list_filtered_events(
    db: Session,
    *,
    review_status: str | None,
    q: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    event_type_id: str | None = None,
    epistemic_status: str | None = None,
    actor_id: str | None = None,
    country: str | None = None,
    admin1: str | None = None,
    city_regency: str | None = None,
    document_id: str | None = None,
    sort: str = "date_desc",
) -> list[Event]:
    events = list_events(db, review_status)
    needle = q.strip().casefold() if q else None

    def matches(event: Event) -> bool:
        if needle and needle not in event.title.casefold() and needle not in event.summary.casefold():
            return False
        if event_type_id and event.event_type_id != event_type_id:
            return False
        if epistemic_status and event.epistemic_status != epistemic_status:
            return False
        if actor_id and actor_id not in {link.actor_id for link in event.event_actors}:
            return False
        if country and country not in {location.country for location in event.locations}:
            return False
        if admin1 and admin1 not in {location.admin1 for location in event.locations}:
            return False
        if city_regency and city_regency not in {location.city_regency for location in event.locations}:
            return False
        if document_id and document_id not in {
            link.source.document_id for link in event.event_sources if link.source.document_id
        }:
            return False
        if date_from or date_to:
            interval = _event_date_interval(event)
            if interval is None:
                return False
            start, end = interval
            if date_from and end < date_from:
                return False
            if date_to and start > date_to:
                return False
        return True

    filtered = [event for event in events if matches(event)]
    if sort == "title_asc":
        return sorted(filtered, key=lambda event: event.title.casefold())
    if sort == "created_desc":
        return sorted(filtered, key=lambda event: event.created_at, reverse=True)
    dated = [(event, _event_date_interval(event)) for event in filtered]
    known = [(event, interval) for event, interval in dated if interval is not None]
    unknown = [event for event, interval in dated if interval is None]
    known.sort(key=lambda item: item[1][0], reverse=sort != "date_asc")
    return [event for event, _interval in known] + unknown


def dashboard_summary(events: list[Event]) -> dict[str, object]:
    now = datetime.now(UTC)
    week_ago = now - timedelta(days=7)
    counts: dict[str, int] = {}
    for event in events:
        name = event.event_type.name if event.event_type else "Uncategorized"
        counts[name] = counts.get(name, 0) + 1

    def approved_within_week(event: Event) -> bool:
        if event.approved_at is None:
            return False
        approved_at = event.approved_at
        if approved_at.tzinfo is None:
            approved_at = approved_at.replace(tzinfo=UTC)
        return approved_at >= week_ago

    return {
        "total_events": len(events),
        "new_events": sum(1 for event in events if approved_within_week(event)),
        "by_event_type": [
            {"name": name, "count": count} for name, count in sorted(counts.items())
        ],
        "incomplete_date_count": sum(1 for event in events if _event_date_interval(event) is None),
        "incomplete_location_count": sum(
            1
            for event in events
            if not any(location.latitude is not None and location.longitude is not None for location in event.locations)
        ),
    }


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


def list_event_types(db: Session) -> list[EventType]:
    return list(db.execute(select(EventType).order_by(EventType.name)).scalars())


def list_actors(db: Session) -> list[Actor]:
    return list(db.execute(select(Actor).order_by(Actor.name)).scalars())


_UNSET = object()


def create_event_type(db: Session, name: str) -> EventType:
    clean_name = name.strip()
    if not clean_name:
        raise EventTypeNameConflictError("Event type name is required.")
    existing = list(db.execute(select(EventType)).scalars())
    if find_by_exact_name(existing, clean_name) is not None:
        raise EventTypeNameConflictError("An event type with this name already exists.")
    event_type = EventType(name=clean_name, is_active=True)
    db.add(event_type)
    db.commit()
    db.refresh(event_type)
    return event_type


def update_event_type(
    db: Session, event_type: EventType, *, name=_UNSET, is_active=_UNSET
) -> EventType:
    if name is not _UNSET:
        clean_name = (name or "").strip()
        if not clean_name:
            raise EventTypeNameConflictError("Event type name is required.")
        others = [
            other
            for other in db.execute(select(EventType)).scalars()
            if other.id != event_type.id
        ]
        if find_by_exact_name(others, clean_name) is not None:
            raise EventTypeNameConflictError("An event type with this name already exists.")
        event_type.name = clean_name
    if is_active is not _UNSET and is_active is not None:
        event_type.is_active = is_active
    db.commit()
    db.refresh(event_type)
    return event_type


def referenced_event_type_ids(db: Session) -> set[str]:
    return {
        row[0]
        for row in db.execute(
            select(Event.event_type_id).where(Event.event_type_id.is_not(None)).distinct()
        )
    }


def delete_event_type(db: Session, event_type: EventType) -> None:
    referenced = db.execute(
        select(Event.id).where(Event.event_type_id == event_type.id).limit(1)
    ).first()
    if referenced is not None:
        raise EventTypeInUseError("This event type is used by an event and cannot be deleted.")
    db.delete(event_type)
    db.commit()


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
        event.locations = []
        for location_input in payload.locations:
            if location_input.country or location_input.admin1 or location_input.city_regency:
                location = Location(
                    country=location_input.country,
                    admin1=location_input.admin1,
                    city_regency=location_input.city_regency,
                )
                apply_coordinates(location)
                event.locations.append(location)

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
    event.approved_at = utc_now()
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


def delete_event(db: Session, event: Event) -> None:
    if event.review_status not in EDITABLE_REVIEW_STATUSES:
        raise EventEditNotAllowedError(event.review_status)
    db.delete(event)
    db.commit()


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
            location_record = Location(
                country=location.country,
                admin1=location.admin1,
                city_regency=location.city_regency,
            )
            apply_coordinates(location_record)
            event.locations.append(location_record)

    for actor_input in payload.actors:
        actor = _resolve_actor(db, actor_input.name)
        event.event_actors.append(EventActor(actor=actor, role=actor_input.role))

    detect_duplicates(db, event)
    db.commit()
    db.refresh(event)
    return event
