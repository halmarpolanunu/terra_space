import json
from datetime import UTC, datetime
from pathlib import Path

import httpx2
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.models import Document
from app.db.session import configure_sqlite_connection
from app.schemas.staged_extraction import SignalCandidate
from app.services.classifiers import (
    run_actors_classifier,
    run_date_classifier,
    run_event_type_classifier,
    run_locations_classifier,
)
from app.services.extraction_log import list_extraction_log
from app.services.lm_studio import LmStudioClient

CANDIDATE = SignalCandidate(
    working_title="Naval blockade imposed",
    summary="The navy imposed a blockade on the ports.",
    epistemic_status="confirmed",
    evidence_quote="The navy imposed a blockade on the ports.",
)


def _session(tmp_path: Path) -> Session:
    engine = create_engine(f"sqlite:///{tmp_path / 'terra-space.db'}")
    configure_sqlite_connection(engine)
    from app.db.base import Base

    Base.metadata.create_all(engine)
    return Session(engine)


def _document(session: Session) -> Document:
    document = Document(
        title="Naval blockade report",
        content="The navy imposed a blockade on the ports.",
        publication_date="2026-07-20",
        input_date=datetime.now(UTC),
        processing_status="processing",
    )
    session.add(document)
    session.commit()
    return document


def _client_returning(content: dict) -> LmStudioClient:
    def handler(request: httpx2.Request) -> httpx2.Response:
        if request.url.path == "/v1/models":
            return httpx2.Response(200, json={"data": [{"id": "local-model"}]})
        if request.url.path == "/v1/chat/completions":
            return httpx2.Response(
                200, json={"choices": [{"message": {"content": json.dumps(content)}}]}
            )
        raise AssertionError(f"unexpected path {request.url.path}")

    return LmStudioClient("http://lm-studio:1234", transport=httpx2.MockTransport(handler))


def _failing_client() -> LmStudioClient:
    def raise_timeout(request: httpx2.Request) -> httpx2.Response:
        raise httpx2.TimeoutException("timed out", request=request)

    return LmStudioClient("http://lm-studio:1234", transport=httpx2.MockTransport(raise_timeout))


def test_run_event_type_classifier_succeeds_and_logs_ok(tmp_path: Path) -> None:
    session = _session(tmp_path)
    document = _document(session)
    client = _client_returning({"existing": "Armed Operation / Strike"})

    result = run_event_type_classifier(session, document, CANDIDATE, 0, client, [])
    session.commit()

    assert result is not None
    assert result.existing == "Armed Operation / Strike"
    entries = list_extraction_log(session, document.id)
    assert len(entries) == 1
    assert entries[0].stage == "event_type"
    assert entries[0].outcome == "ok"
    assert entries[0].candidate_index == 0
    assert "Armed Operation / Strike" in entries[0].detail


def test_run_event_type_classifier_failure_is_logged_and_returned_not_raised(
    tmp_path: Path,
) -> None:
    session = _session(tmp_path)
    document = _document(session)
    client = _failing_client()

    result = run_event_type_classifier(session, document, CANDIDATE, 1, client, [])
    session.commit()

    assert result is None
    entries = list_extraction_log(session, document.id)
    assert len(entries) == 1
    assert entries[0].stage == "event_type"
    assert entries[0].outcome == "failed"
    assert entries[0].candidate_index == 1


def test_run_date_classifier_succeeds_and_logs_ok(tmp_path: Path) -> None:
    session = _session(tmp_path)
    document = _document(session)
    client = _client_returning({"event_date": "2026-07-20", "event_date_precision": "exact"})

    result = run_date_classifier(session, document, CANDIDATE, 0, client)
    session.commit()

    assert result is not None
    assert result.event_date == "2026-07-20"
    entries = list_extraction_log(session, document.id)
    assert entries[0].stage == "event_date"
    assert entries[0].outcome == "ok"


def test_run_date_classifier_failure_is_logged_and_returned_not_raised(tmp_path: Path) -> None:
    session = _session(tmp_path)
    document = _document(session)
    client = _failing_client()

    result = run_date_classifier(session, document, CANDIDATE, 0, client)
    session.commit()

    assert result is None
    entries = list_extraction_log(session, document.id)
    assert entries[0].stage == "event_date"
    assert entries[0].outcome == "failed"


def test_run_locations_classifier_succeeds_and_logs_ok(tmp_path: Path) -> None:
    session = _session(tmp_path)
    document = _document(session)
    client = _client_returning(
        {"locations": [{"country": "IRN", "admin1": None, "city_regency": None}]}
    )

    result = run_locations_classifier(session, document, CANDIDATE, 0, client)
    session.commit()

    assert result is not None
    assert len(result.locations) == 1
    entries = list_extraction_log(session, document.id)
    assert entries[0].stage == "locations"
    assert entries[0].outcome == "ok"


def test_run_locations_classifier_failure_is_logged_and_returned_not_raised(
    tmp_path: Path,
) -> None:
    session = _session(tmp_path)
    document = _document(session)
    client = _failing_client()

    result = run_locations_classifier(session, document, CANDIDATE, 0, client)
    session.commit()

    assert result is None
    entries = list_extraction_log(session, document.id)
    assert entries[0].stage == "locations"
    assert entries[0].outcome == "failed"


def test_run_actors_classifier_succeeds_and_logs_ok(tmp_path: Path) -> None:
    session = _session(tmp_path)
    document = _document(session)
    client = _client_returning({"source_actors": ["Navy"], "recipient_actors": []})

    result = run_actors_classifier(session, document, CANDIDATE, 0, client, ["Navy"])
    session.commit()

    assert result is not None
    assert result.source_actors == ["Navy"]
    entries = list_extraction_log(session, document.id)
    assert entries[0].stage == "actors"
    assert entries[0].outcome == "ok"


def test_run_actors_classifier_failure_is_logged_and_returned_not_raised(tmp_path: Path) -> None:
    session = _session(tmp_path)
    document = _document(session)
    client = _failing_client()

    result = run_actors_classifier(session, document, CANDIDATE, 0, client, [])
    session.commit()

    assert result is None
    entries = list_extraction_log(session, document.id)
    assert entries[0].stage == "actors"
    assert entries[0].outcome == "failed"
