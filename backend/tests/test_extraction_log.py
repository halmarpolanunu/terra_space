from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.models import Document, ExtractionLogEntry
from app.db.session import configure_sqlite_connection
from app.services.extraction_log import list_extraction_log, log_extraction


def _session(tmp_path: Path) -> Session:
    engine = create_engine(f"sqlite:///{tmp_path / 'terra-space.db'}")
    configure_sqlite_connection(engine)
    from app.db.base import Base

    Base.metadata.create_all(engine)
    return Session(engine)


def _document(session: Session) -> Document:
    document = Document(
        title="Document",
        content="Content",
        publication_date="2026-07-10",
        input_date=datetime.now(UTC),
        processing_status="processing",
    )
    session.add(document)
    session.commit()
    return document


def test_log_extraction_persists_entry_with_expected_fields(tmp_path: Path) -> None:
    session = _session(tmp_path)
    document = _document(session)

    entry = log_extraction(
        session,
        document_id=document.id,
        stage="signal_parser",
        outcome="ok",
        detail="Parsed 3 candidates.",
    )
    session.commit()

    assert entry.id is not None
    stored = session.get(ExtractionLogEntry, entry.id)
    assert stored is not None
    assert stored.document_id == document.id
    assert stored.stage == "signal_parser"
    assert stored.outcome == "ok"
    assert stored.detail == "Parsed 3 candidates."
    assert stored.candidate_index is None
    assert stored.created_at is not None


def test_log_extraction_accepts_a_candidate_index(tmp_path: Path) -> None:
    session = _session(tmp_path)
    document = _document(session)

    entry = log_extraction(
        session,
        document_id=document.id,
        stage="locations",
        outcome="dropped",
        detail="Location text not found in the evidence quote.",
        candidate_index=2,
    )
    session.commit()

    stored = session.get(ExtractionLogEntry, entry.id)
    assert stored is not None
    assert stored.candidate_index == 2


def test_list_extraction_log_returns_entries_newest_first(tmp_path: Path) -> None:
    session = _session(tmp_path)
    document = _document(session)

    first = log_extraction(
        session, document_id=document.id, stage="signal_parser", outcome="ok", detail="First."
    )
    session.commit()
    first.created_at = datetime(2026, 7, 20, 10, 0, 0, tzinfo=UTC)
    session.commit()

    second = log_extraction(
        session, document_id=document.id, stage="event_type", outcome="ok", detail="Second."
    )
    session.commit()
    second.created_at = datetime(2026, 7, 20, 11, 0, 0, tzinfo=UTC)
    session.commit()

    entries = list_extraction_log(session, document.id)

    assert [entry.detail for entry in entries] == ["Second.", "First."]


def test_deleting_a_document_removes_its_extraction_log_entries(tmp_path: Path) -> None:
    session = _session(tmp_path)
    document = _document(session)
    log_extraction(
        session, document_id=document.id, stage="signal_parser", outcome="ok", detail="Entry."
    )
    session.commit()

    session.delete(document)
    session.commit()

    assert list_extraction_log(session, document.id) == []
