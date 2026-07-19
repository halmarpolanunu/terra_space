from datetime import UTC, date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import DuplicateFlag, Event, Location

DATE_PROXIMITY_DAYS = 3


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


def _dates_close_enough(a: Event, b: Event) -> bool:
    date_a = _parse_date(a.event_date)
    date_b = _parse_date(b.event_date)
    if date_a is None or date_b is None:
        return True
    return abs((date_a - date_b).days) <= DATE_PROXIMITY_DAYS


def _shared_actor_names(a: Event, b: Event) -> list[str]:
    actors_a = {event_actor.actor_id: event_actor.actor.name for event_actor in a.event_actors}
    actors_b = {event_actor.actor_id: event_actor.actor.name for event_actor in b.event_actors}
    shared_ids = actors_a.keys() & actors_b.keys()
    return [actors_a[actor_id] for actor_id in shared_ids]


def _location_key(location: Location) -> tuple[str | None, str | None, str | None]:
    return (location.country, location.admin1, location.city_regency)


def _shared_location_labels(a: Event, b: Event) -> list[str]:
    locations_a = {_location_key(location): location for location in a.locations}
    locations_b = {_location_key(location): location for location in b.locations}
    shared_keys = locations_a.keys() & locations_b.keys()
    labels = []
    for key in shared_keys:
        location = locations_a[key]
        label = location.city_regency or location.admin1 or location.country
        if label:
            labels.append(label)
    return labels


def _match_signals(draft: Event, approved: Event) -> tuple[list[str], list[str]] | None:
    if draft.event_type_id is None or draft.event_type_id != approved.event_type_id:
        return None
    if not _dates_close_enough(draft, approved):
        return None
    shared_actors = _shared_actor_names(draft, approved)
    shared_locations = _shared_location_labels(draft, approved)
    if not shared_actors and not shared_locations:
        return None
    return shared_actors, shared_locations


def _build_matched_reason(
    draft: Event, approved: Event, shared_actors: list[str], shared_locations: list[str]
) -> str:
    parts = [f"same type ({draft.event_type.name})"]

    date_a = _parse_date(draft.event_date)
    date_b = _parse_date(approved.event_date)
    if date_a is not None and date_b is not None:
        diff = abs((date_a - date_b).days)
        parts.append("same date" if diff == 0 else f"dates {diff} day(s) apart")

    if shared_actors:
        parts.append(f"shared actor ({', '.join(sorted(shared_actors))})")
    if shared_locations:
        parts.append(f"same location ({', '.join(sorted(shared_locations))})")

    return "; ".join(parts)


def detect_duplicates(db: Session, event: Event) -> list[DuplicateFlag]:
    """Flag `event` (always a fresh draft) against already-approved events it resembles.

    Only ever compares draft-vs-approved, never draft-vs-draft, and is idempotent: calling
    this again for the same draft event does not create a second flag against the same
    approved event.
    """
    db.flush()

    already_flagged_ids = {
        flag.matched_event_id
        for flag in db.execute(
            select(DuplicateFlag).where(DuplicateFlag.draft_event_id == event.id)
        ).scalars()
    }

    approved_events = list(
        db.execute(select(Event).where(Event.review_status == "approved")).scalars()
    )

    created: list[DuplicateFlag] = []
    for approved in approved_events:
        if approved.id in already_flagged_ids:
            continue
        signals = _match_signals(event, approved)
        if signals is None:
            continue
        shared_actors, shared_locations = signals
        flag = DuplicateFlag(
            draft_event_id=event.id,
            matched_event_id=approved.id,
            matched_reason=_build_matched_reason(event, approved, shared_actors, shared_locations),
            resolution="pending",
        )
        db.add(flag)
        created.append(flag)

    if created:
        db.flush()
    return created


class DuplicateFlagAlreadyResolvedError(Exception):
    """Raised when resolving a DuplicateFlag whose resolution is no longer pending."""

    def __init__(self, resolution: str) -> None:
        self.resolution = resolution
        super().__init__(f"Duplicate flag was already resolved as {resolution}.")


def resolve_duplicate_flag(
    db: Session, event: Event, flag: DuplicateFlag, resolution: str
) -> Event:
    if flag.resolution != "pending":
        raise DuplicateFlagAlreadyResolvedError(flag.resolution)

    flag.resolution = resolution
    flag.resolved_at = datetime.now(UTC)

    if resolution == "linked":
        matched_event = db.get(Event, flag.matched_event_id)
        existing_source_ids = {
            event_source.source_id for event_source in matched_event.event_sources
        }
        for event_source in list(event.event_sources):
            if event_source.source_id in existing_source_ids:
                db.delete(event_source)
            else:
                event_source.event = matched_event
                existing_source_ids.add(event_source.source_id)
        event.review_status = "merged"

    db.commit()
    db.refresh(event)
    return event
