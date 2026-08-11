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


def _published_event(
    event_type: EventType,
    event_date: str | None = "2026-07-10",
    actor: Actor | None = None,
    location: Location | None = None,
) -> Event:
    event = Event(
        title="Published event",
        summary="Summary.",
        epistemic_status="confirmed",
        origin="manual",
        dashboard_status="published",
        event_type=event_type,
        event_date=event_date,
    )
    if actor is not None:
        event.event_actors.append(EventActor(actor=actor, role="source"))
    if location is not None:
        event.locations.append(location)
    return event


def _new_event(
    event_type: EventType,
    event_date: str | None = "2026-07-11",
    actor: Actor | None = None,
    location: Location | None = None,
) -> Event:
    event = Event(
        title="New event",
        summary="Summary.",
        epistemic_status="confirmed",
        origin="manual",
        dashboard_status="hidden",
        event_type=event_type,
        event_date=event_date,
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
        published = _published_event(event_type, actor=actor)
        session.add(published)
        session.commit()

        new_event = _new_event(event_type, actor=actor)
        session.add(new_event)

        flags = detect_duplicates(session, new_event)
        session.commit()

        assert len(flags) == 1
        assert flags[0].matched_event_id == published.id
        assert flags[0].resolution == "pending"
        assert "Airstrike" in flags[0].matched_reason


def test_flags_same_type_close_dates_and_shared_location(tmp_path: Path) -> None:
    with _session(tmp_path) as session:
        event_type = EventType(name="Airstrike", is_active=True)
        published = _published_event(
            event_type, location=Location(country="YE", admin1="Sana'a", city_regency=None)
        )
        session.add(published)
        session.commit()

        new_event = _new_event(
            event_type, location=Location(country="YE", admin1="Sana'a", city_regency=None)
        )
        session.add(new_event)

        flags = detect_duplicates(session, new_event)
        session.commit()

        assert len(flags) == 1
        assert flags[0].matched_event_id == published.id


def test_does_not_flag_when_only_type_matches(tmp_path: Path) -> None:
    with _session(tmp_path) as session:
        event_type = EventType(name="Airstrike", is_active=True)
        published = _published_event(event_type)
        session.add(published)
        session.commit()

        new_event = _new_event(event_type)
        session.add(new_event)

        flags = detect_duplicates(session, new_event)
        session.commit()

        assert flags == []
        assert session.query(DuplicateFlag).count() == 0


def test_does_not_flag_when_dates_are_far_apart(tmp_path: Path) -> None:
    with _session(tmp_path) as session:
        event_type = EventType(name="Airstrike", is_active=True)
        actor = Actor(name="Air Force", is_active=True)
        published = _published_event(event_type, event_date="2026-01-01", actor=actor)
        session.add(published)
        session.commit()

        new_event = _new_event(event_type, event_date="2026-07-11", actor=actor)
        session.add(new_event)

        flags = detect_duplicates(session, new_event)
        session.commit()

        assert flags == []


def test_does_not_flag_against_hidden_or_rejected_events(tmp_path: Path) -> None:
    with _session(tmp_path) as session:
        event_type = EventType(name="Airstrike", is_active=True)
        actor = Actor(name="Air Force", is_active=True)
        other_hidden = _new_event(event_type, actor=actor)
        other_hidden.dashboard_status = "hidden"
        rejected = _new_event(event_type, actor=actor)
        rejected.dashboard_status = "rejected"
        session.add_all([other_hidden, rejected])
        session.commit()

        new_event = _new_event(event_type, actor=actor)
        session.add(new_event)

        flags = detect_duplicates(session, new_event)
        session.commit()

        assert flags == []


def test_detecting_twice_does_not_create_duplicate_flags(tmp_path: Path) -> None:
    with _session(tmp_path) as session:
        event_type = EventType(name="Airstrike", is_active=True)
        actor = Actor(name="Air Force", is_active=True)
        published = _published_event(event_type, actor=actor)
        session.add(published)
        session.commit()

        new_event = _new_event(event_type, actor=actor)
        session.add(new_event)
        session.commit()

        first = detect_duplicates(session, new_event)
        session.commit()
        second = detect_duplicates(session, new_event)
        session.commit()

        assert len(first) == 1
        assert second == []
        assert session.query(DuplicateFlag).count() == 1
