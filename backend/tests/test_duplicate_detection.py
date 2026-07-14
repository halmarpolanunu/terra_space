from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.models import Actor, DuplicateFlag, Event, EventActor, EventType, Location
from app.db.session import configure_sqlite_connection
from app.services.duplicates import detect_duplicates


def _session(tmp_path: Path) -> Session:
    engine = create_engine(f"sqlite:///{tmp_path / 'terra-space.db'}")
    configure_sqlite_connection(engine)
    Base.metadata.create_all(engine)
    return Session(engine)


def _approved_event(
    event_type: EventType,
    start_date: str | None = "2026-07-10",
    actor: Actor | None = None,
    location: Location | None = None,
) -> Event:
    event = Event(
        title="Approved event",
        summary="Summary.",
        epistemic_status="confirmed",
        review_status="approved",
        event_type=event_type,
        start_date=start_date,
    )
    if actor is not None:
        event.event_actors.append(EventActor(actor=actor, role="source"))
    if location is not None:
        event.locations.append(location)
    return event


def _draft_event(
    event_type: EventType,
    start_date: str | None = "2026-07-11",
    actor: Actor | None = None,
    location: Location | None = None,
) -> Event:
    event = Event(
        title="Draft event",
        summary="Summary.",
        epistemic_status="claim",
        review_status="draft",
        event_type=event_type,
        start_date=start_date,
    )
    if actor is not None:
        event.event_actors.append(EventActor(actor=actor, role="source"))
    if location is not None:
        event.locations.append(location)
    return event


def test_flags_same_type_close_dates_and_shared_actor(tmp_path: Path) -> None:
    with _session(tmp_path) as session:
        event_type = EventType(name="Airstrike", is_active=True)
        actor = Actor(name="Air Force", is_active=True)
        approved = _approved_event(event_type, actor=actor)
        session.add(approved)
        session.commit()

        draft = _draft_event(event_type, actor=actor)
        session.add(draft)

        flags = detect_duplicates(session, draft)
        session.commit()

        assert len(flags) == 1
        assert flags[0].matched_event_id == approved.id
        assert flags[0].resolution == "pending"
        assert "Airstrike" in flags[0].matched_reason


def test_flags_same_type_close_dates_and_shared_location(tmp_path: Path) -> None:
    with _session(tmp_path) as session:
        event_type = EventType(name="Airstrike", is_active=True)
        approved = _approved_event(
            event_type, location=Location(country="YE", admin1="Sana'a", city_regency=None)
        )
        session.add(approved)
        session.commit()

        draft = _draft_event(
            event_type, location=Location(country="YE", admin1="Sana'a", city_regency=None)
        )
        session.add(draft)

        flags = detect_duplicates(session, draft)
        session.commit()

        assert len(flags) == 1
        assert flags[0].matched_event_id == approved.id


def test_does_not_flag_when_only_type_matches(tmp_path: Path) -> None:
    with _session(tmp_path) as session:
        event_type = EventType(name="Airstrike", is_active=True)
        approved = _approved_event(event_type)
        session.add(approved)
        session.commit()

        draft = _draft_event(event_type)
        session.add(draft)

        flags = detect_duplicates(session, draft)
        session.commit()

        assert flags == []
        assert session.query(DuplicateFlag).count() == 0


def test_does_not_flag_when_dates_are_far_apart(tmp_path: Path) -> None:
    with _session(tmp_path) as session:
        event_type = EventType(name="Airstrike", is_active=True)
        actor = Actor(name="Air Force", is_active=True)
        approved = _approved_event(event_type, start_date="2026-01-01", actor=actor)
        session.add(approved)
        session.commit()

        draft = _draft_event(event_type, start_date="2026-07-11", actor=actor)
        session.add(draft)

        flags = detect_duplicates(session, draft)
        session.commit()

        assert flags == []


def test_does_not_flag_against_draft_or_rejected_events(tmp_path: Path) -> None:
    with _session(tmp_path) as session:
        event_type = EventType(name="Airstrike", is_active=True)
        actor = Actor(name="Air Force", is_active=True)
        other_draft = _draft_event(event_type, actor=actor)
        other_draft.review_status = "draft"
        rejected = _draft_event(event_type, actor=actor)
        rejected.review_status = "rejected"
        session.add_all([other_draft, rejected])
        session.commit()

        draft = _draft_event(event_type, actor=actor)
        session.add(draft)

        flags = detect_duplicates(session, draft)
        session.commit()

        assert flags == []


def test_detecting_twice_does_not_create_duplicate_flags(tmp_path: Path) -> None:
    with _session(tmp_path) as session:
        event_type = EventType(name="Airstrike", is_active=True)
        actor = Actor(name="Air Force", is_active=True)
        approved = _approved_event(event_type, actor=actor)
        session.add(approved)
        session.commit()

        draft = _draft_event(event_type, actor=actor)
        session.add(draft)
        session.commit()

        first = detect_duplicates(session, draft)
        session.commit()
        second = detect_duplicates(session, draft)
        session.commit()

        assert len(first) == 1
        assert second == []
        assert session.query(DuplicateFlag).count() == 1
