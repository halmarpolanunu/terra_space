from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.models import Document, Event, EventSource, Source
from app.db.session import configure_sqlite_connection
from app.services.events import incomplete_extraction_stages
from app.services.extraction_log import log_extraction


def _session(tmp_path: Path) -> Session:
    engine = create_engine(f"sqlite:///{tmp_path / 'terra-space.db'}")
    configure_sqlite_connection(engine)
    Base.metadata.create_all(engine)
    return Session(engine)


def _document(session: Session) -> Document:
    document = Document(
        title="Document",
        content="Content",
        publication_date="2026-07-10",
        input_date=datetime.now(UTC),
        processing_status="completed",
    )
    session.add(document)
    session.commit()
    return document


def _event_from_candidate(session: Session, document: Document, candidate_index: int) -> Event:
    source = Source(document=document, reference_label=document.title)
    event = Event(
        title="Event",
        summary="Summary",
        epistemic_status="confirmed",
        review_status="draft",
        extraction_incomplete=True,
        candidate_index=candidate_index,
    )
    event.event_sources.append(EventSource(source=source, evidence_quote="Evidence"))
    session.add(event)
    session.commit()
    return event


def test_returns_distinct_failed_stages_for_the_events_own_candidate(tmp_path: Path) -> None:
    session = _session(tmp_path)
    document = _document(session)
    event = _event_from_candidate(session, document, candidate_index=0)
    log_extraction(
        session, document_id=document.id, candidate_index=0, stage="locations",
        outcome="failed", detail="x",
    )
    log_extraction(
        session, document_id=document.id, candidate_index=0, stage="actors",
        outcome="failed", detail="x",
    )
    log_extraction(
        session, document_id=document.id, candidate_index=0, stage="event_type",
        outcome="ok", detail="x",
    )
    session.commit()

    assert incomplete_extraction_stages(session, event) == ["actors", "locations"]


def test_ignores_failed_entries_from_a_different_candidate_in_the_same_document(
    tmp_path: Path,
) -> None:
    session = _session(tmp_path)
    document = _document(session)
    event = _event_from_candidate(session, document, candidate_index=1)
    log_extraction(
        session, document_id=document.id, candidate_index=0, stage="locations",
        outcome="failed", detail="x",
    )
    session.commit()

    assert incomplete_extraction_stages(session, event) == []


def test_returns_empty_list_when_the_event_has_no_candidate_index(tmp_path: Path) -> None:
    session = _session(tmp_path)
    document = _document(session)
    source = Source(document=document, reference_label=document.title)
    event = Event(
        title="Manual event",
        summary="Summary",
        epistemic_status="confirmed",
        review_status="draft",
    )
    event.event_sources.append(EventSource(source=source, evidence_quote="Evidence"))
    session.add(event)
    session.commit()

    assert incomplete_extraction_stages(session, event) == []
