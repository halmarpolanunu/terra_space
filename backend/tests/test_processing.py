from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.models import Document, Event, EventSource, Source
from app.main import create_app
from app.schemas.extraction import ExtractedEvent, ExtractedEventType, ExtractionResult
from app.services.lm_studio import LmStudioResponseError


class FakeLmStudioClient:
    """Test double standing in for LmStudioClient.extract_events."""

    def __init__(self, outcomes: dict[str, ExtractionResult | Exception]) -> None:
        self._outcomes = outcomes

    def extract_events(
        self, document_text: str, known_types: list[str], known_actors: list[str]
    ) -> ExtractionResult:
        outcome = self._outcomes[document_text]
        if isinstance(outcome, Exception):
            raise outcome
        return outcome


def _extraction_for(content: str) -> ExtractionResult:
    return ExtractionResult(
        events=[
            ExtractedEvent(
                title="Extracted event",
                summary="Summary.",
                event_type=ExtractedEventType(suggested="Report"),
                epistemic_status="confirmed",
                evidence_quote=content,
            )
        ]
    )


def _client(tmp_path: Path, outcomes: dict[str, ExtractionResult | Exception]) -> TestClient:
    app = create_app(
        settings=Settings(data_dir=tmp_path),
        lm_studio_check=lambda: True,
        lm_studio_client=FakeLmStudioClient(outcomes),
    )
    return TestClient(app)


def _create_document(client: TestClient, content: str) -> dict:
    response = client.post(
        "/api/documents",
        json={"title": content, "content": content, "document_date": "2026-07-10"},
    )
    assert response.status_code == 201
    return response.json()


def test_batch_where_second_document_fails_still_completes_first_and_third(
    tmp_path: Path,
) -> None:
    contents = ["First document body.", "Second document body.", "Third document body."]
    outcomes: dict[str, ExtractionResult | Exception] = {
        contents[0]: _extraction_for(contents[0]),
        contents[1]: LmStudioResponseError("LM Studio returned malformed output."),
        contents[2]: _extraction_for(contents[2]),
    }
    client = _client(tmp_path, outcomes)
    documents = [_create_document(client, content) for content in contents]

    response = client.post(
        "/api/documents/process", json={"document_ids": [doc["id"] for doc in documents]}
    )
    assert response.status_code == 202

    statuses = {
        doc["id"]: client.get(f"/api/documents/{doc['id']}").json() for doc in documents
    }
    assert statuses[documents[0]["id"]]["processing_status"] == "ready_for_review"
    assert statuses[documents[1]["id"]]["processing_status"] == "failed"
    assert statuses[documents[1]["id"]]["processing_error"]
    assert statuses[documents[2]["id"]]["processing_status"] == "ready_for_review"


def test_document_already_queued_or_processing_cannot_be_batched(tmp_path: Path) -> None:
    app = create_app(
        settings=Settings(data_dir=tmp_path), lm_studio_check=lambda: True, lm_studio_client=FakeLmStudioClient({})
    )
    client = TestClient(app)
    created = _create_document(client, "Body text.")

    with app.state.session_factory() as session:
        document = session.get(Document, created["id"])
        document.processing_status = "processing"
        session.commit()

    response = client.post("/api/documents/process", json={"document_ids": [created["id"]]})
    assert response.status_code == 409


def test_retry_only_works_on_failed_document_and_clears_previous_error(tmp_path: Path) -> None:
    content = "Retryable document body."
    client = _client(tmp_path, {content: _extraction_for(content)})
    app = client.app
    created = _create_document(client, content)

    draft_response = client.post(f"/api/documents/{created['id']}/retry")
    assert draft_response.status_code == 409

    with app.state.session_factory() as session:
        document = session.get(Document, created["id"])
        document.processing_status = "failed"
        document.processing_error = "LM Studio timed out."
        session.commit()

    response = client.post(f"/api/documents/{created['id']}/retry")
    assert response.status_code == 202

    updated = client.get(f"/api/documents/{created['id']}").json()
    assert updated["processing_status"] == "ready_for_review"
    assert updated["processing_error"] is None


def test_reprocessing_a_completed_document_with_approved_events_requires_confirmation(
    tmp_path: Path,
) -> None:
    content = "Completed document body."
    client = _client(tmp_path, {content: _extraction_for(content)})
    app = client.app
    created = _create_document(client, content)

    with app.state.session_factory() as session:
        document = session.get(Document, created["id"])
        document.processing_status = "completed"
        source = Source(document=document, reference_label=document.title)
        event = Event(
            title="Approved event",
            summary="Summary.",
            epistemic_status="confirmed",
            review_status="approved",
        )
        event.event_sources.append(EventSource(source=source, evidence_quote=content))
        session.add(event)
        session.commit()

    warned = client.post("/api/documents/process", json={"document_ids": [created["id"]]})
    assert warned.status_code == 202
    assert warned.json() == {
        "status": "confirmation_required",
        "document_ids": [created["id"]],
    }
    assert client.get(f"/api/documents/{created['id']}").json()["processing_status"] == "completed"

    confirmed = client.post(
        "/api/documents/process",
        json={"document_ids": [created["id"]], "confirm_reprocess": True},
    )
    assert confirmed.status_code == 202
    assert confirmed.json()["status"] == "queued"
    assert (
        client.get(f"/api/documents/{created['id']}").json()["processing_status"]
        == "ready_for_review"
    )
