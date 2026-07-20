import json
from datetime import UTC, datetime
from pathlib import Path

import httpx2
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.models import Document
from app.db.session import configure_sqlite_connection
from app.services.extraction_log import list_extraction_log
from app.services.lm_studio import LmStudioClient
from app.services.signal_parser import parse_and_validate_signals


def _session(tmp_path: Path) -> Session:
    engine = create_engine(f"sqlite:///{tmp_path / 'terra-space.db'}")
    configure_sqlite_connection(engine)
    from app.db.base import Base

    Base.metadata.create_all(engine)
    return Session(engine)


def _document(session: Session, content: str) -> Document:
    document = Document(
        title="Naval blockade report",
        content=content,
        publication_date="2026-07-20",
        input_date=datetime.now(UTC),
        processing_status="processing",
    )
    session.add(document)
    session.commit()
    return document


def _client_with_candidates(candidates: list[dict]) -> LmStudioClient:
    def handler(request: httpx2.Request) -> httpx2.Response:
        if request.url.path == "/v1/models":
            return httpx2.Response(200, json={"data": [{"id": "local-model"}]})
        if request.url.path == "/v1/chat/completions":
            content = json.dumps({"candidates": candidates})
            return httpx2.Response(200, json={"choices": [{"message": {"content": content}}]})
        raise AssertionError(f"unexpected path {request.url.path}")

    return LmStudioClient("http://lm-studio:1234", transport=httpx2.MockTransport(handler))


def test_grounded_candidates_are_kept(tmp_path: Path) -> None:
    content = "The navy imposed a blockade on the ports. Talks are set for Friday."
    session = _session(tmp_path)
    document = _document(session, content)
    client = _client_with_candidates(
        [
            {
                "working_title": "Naval blockade imposed",
                "summary": "The navy imposed a blockade.",
                "epistemic_status": "confirmed",
                "evidence_quote": "The navy imposed a blockade on the ports.",
            },
            {
                "working_title": "Talks scheduled",
                "summary": "Talks are scheduled.",
                "epistemic_status": "claim",
                "evidence_quote": "Talks are set for Friday.",
            },
        ]
    )

    kept = parse_and_validate_signals(session, document, client)
    session.commit()

    assert [candidate.working_title for candidate in kept] == [
        "Naval blockade imposed",
        "Talks scheduled",
    ]
    assert list_extraction_log(session, document.id) == []


def test_ungrounded_candidate_is_dropped_and_logged(tmp_path: Path) -> None:
    content = "The navy imposed a blockade on the ports."
    session = _session(tmp_path)
    document = _document(session, content)
    client = _client_with_candidates(
        [
            {
                "working_title": "Naval blockade imposed",
                "summary": "The navy imposed a blockade.",
                "epistemic_status": "confirmed",
                "evidence_quote": "The navy imposed a blockade on the ports.",
            },
            {
                "working_title": "Invented occurrence",
                "summary": "Something not in the text.",
                "epistemic_status": "claim",
                "evidence_quote": "This sentence does not appear in the document.",
            },
        ]
    )

    kept = parse_and_validate_signals(session, document, client)
    session.commit()

    assert [candidate.working_title for candidate in kept] == ["Naval blockade imposed"]
    entries = list_extraction_log(session, document.id)
    assert len(entries) == 1
    assert entries[0].stage == "signal_parser"
    assert entries[0].outcome == "dropped"
    assert "Invented occurrence" in entries[0].detail
    assert entries[0].candidate_index is None


def test_all_candidates_ungrounded_returns_empty_list_with_two_dropped_logs(
    tmp_path: Path,
) -> None:
    content = "Nothing relevant here."
    session = _session(tmp_path)
    document = _document(session, content)
    client = _client_with_candidates(
        [
            {
                "working_title": "First invented",
                "summary": "Not real.",
                "epistemic_status": "rumor",
                "evidence_quote": "Not in the document at all.",
            },
            {
                "working_title": "Second invented",
                "summary": "Also not real.",
                "epistemic_status": "rumor",
                "evidence_quote": "Also not in the document.",
            },
        ]
    )

    kept = parse_and_validate_signals(session, document, client)
    session.commit()

    assert kept == []
    entries = list_extraction_log(session, document.id)
    assert len(entries) == 2
    assert {entry.outcome for entry in entries} == {"dropped"}
