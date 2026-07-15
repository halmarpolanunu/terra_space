from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.models import DuplicateFlag
from app.main import create_app
from app.schemas.extraction import ExtractedActor, ExtractedEvent, ExtractedEventType, ExtractionResult


class FakeLmStudioClient:
    def __init__(self, outcomes: dict[str, ExtractionResult]) -> None:
        self._outcomes = outcomes

    def extract_events(
        self, document_text: str, known_types: list[str], known_actors: list[str]
    ) -> ExtractionResult:
        return self._outcomes[document_text]


def _client(tmp_path: Path, outcomes: dict[str, ExtractionResult]) -> TestClient:
    app = create_app(
        settings=Settings(data_dir=tmp_path),
        lm_studio_check=lambda: True,
        lm_studio_client=FakeLmStudioClient(outcomes),
    )
    return TestClient(app)


def _create_and_process_document(client: TestClient, content: str) -> dict:
    response = client.post(
        "/api/documents",
        json={"title": content, "content": content, "document_date": "2026-07-10"},
    )
    assert response.status_code == 201
    document = response.json()
    process_response = client.post(
        "/api/documents/process", json={"document_ids": [document["id"]]}
    )
    assert process_response.status_code == 202
    return document


def _extraction_with_suggestions(content: str) -> ExtractionResult:
    return ExtractionResult(
        events=[
            ExtractedEvent(
                title="Depot attack",
                summary="A militia group reportedly attacked a fuel depot.",
                event_type=ExtractedEventType(suggested="Attack"),
                epistemic_status="claim",
                evidence_quote=content,
                actors=[ExtractedActor(name="Local Militia", role="source", existing=False)],
            )
        ]
    )


def test_approving_event_flips_suggested_type_and_actor_to_active(tmp_path: Path) -> None:
    content = "A local militia reportedly attacked the fuel depot on 2026-07-10."
    extraction = _extraction_with_suggestions(content)
    client = _client(tmp_path, {content: extraction})
    document = _create_and_process_document(client, content)
    event = client.get(f"/api/documents/{document['id']}/events").json()[0]

    response = client.post(f"/api/events/{event['id']}/approve")
    assert response.status_code == 200
    body = response.json()
    assert body["review_status"] == "approved"
    assert body["event_type"]["is_active"] is True
    assert body["actors"][0]["actor"]["is_active"] is True


def test_approving_event_with_pending_duplicate_flag_returns_409(tmp_path: Path) -> None:
    content = "Something happened on 2026-07-10."
    extraction = ExtractionResult(
        events=[
            ExtractedEvent(
                title="Something",
                summary="Summary.",
                event_type=ExtractedEventType(suggested="Report"),
                epistemic_status="confirmed",
                evidence_quote=content,
            )
        ]
    )
    client = _client(tmp_path, {content: extraction})
    app = client.app
    document = _create_and_process_document(client, content)
    event = client.get(f"/api/documents/{document['id']}/events").json()[0]

    with app.state.session_factory() as session:
        flag = DuplicateFlag(
            draft_event_id=event["id"],
            matched_event_id=event["id"],
            matched_reason="test setup",
            resolution="pending",
        )
        session.add(flag)
        session.commit()

    response = client.post(f"/api/events/{event['id']}/approve")
    assert response.status_code == 409


def test_rejecting_event_never_deletes_it(tmp_path: Path) -> None:
    content = "Something happened on 2026-07-10."
    extraction = ExtractionResult(
        events=[
            ExtractedEvent(
                title="Something",
                summary="Summary.",
                event_type=ExtractedEventType(suggested="Report"),
                epistemic_status="confirmed",
                evidence_quote=content,
            )
        ]
    )
    client = _client(tmp_path, {content: extraction})
    document = _create_and_process_document(client, content)
    event = client.get(f"/api/documents/{document['id']}/events").json()[0]

    response = client.post(f"/api/events/{event['id']}/reject")
    assert response.status_code == 200
    assert response.json()["review_status"] == "rejected"

    still_there = client.get(f"/api/events/{event['id']}")
    assert still_there.status_code == 200
    assert still_there.json()["review_status"] == "rejected"


def test_editing_approved_event_keeps_it_approved(tmp_path: Path) -> None:
    content = "Something happened on 2026-07-10."
    extraction = ExtractionResult(
        events=[
            ExtractedEvent(
                title="Something",
                summary="Summary.",
                event_type=ExtractedEventType(suggested="Report"),
                epistemic_status="confirmed",
                evidence_quote=content,
            )
        ]
    )
    client = _client(tmp_path, {content: extraction})
    document = _create_and_process_document(client, content)
    event = client.get(f"/api/documents/{document['id']}/events").json()[0]
    client.post(f"/api/events/{event['id']}/approve")

    response = client.patch(f"/api/events/{event['id']}", json={"title": "Nope"})
    assert response.status_code == 200
    assert response.json()["title"] == "Nope"
    assert response.json()["review_status"] == "approved"


def test_manual_add_with_quote_not_in_document_is_rejected(tmp_path: Path) -> None:
    client = _client(tmp_path, {})
    document = client.post(
        "/api/documents",
        json={
            "title": "Field note",
            "content": "Reported a checkpoint closure near the bridge.",
            "document_date": "2026-07-10",
        },
    ).json()

    response = client.post(
        "/api/events",
        json={
            "document_id": document["id"],
            "evidence_quote": "This sentence does not appear anywhere in the document.",
            "title": "Checkpoint closure",
            "summary": "A checkpoint was closed near the bridge.",
            "epistemic_status": "confirmed",
        },
    )
    assert response.status_code == 422


def test_manual_add_with_valid_quote_creates_draft_event(tmp_path: Path) -> None:
    client = _client(tmp_path, {})
    content = "Reported a checkpoint closure near the bridge."
    document = client.post(
        "/api/documents",
        json={"title": "Field note", "content": content, "document_date": "2026-07-10"},
    ).json()

    response = client.post(
        "/api/events",
        json={
            "document_id": document["id"],
            "evidence_quote": "checkpoint closure near the bridge",
            "title": "Checkpoint closure",
            "summary": "A checkpoint was closed near the bridge.",
            "epistemic_status": "confirmed",
            "event_type": {"suggested": "Checkpoint"},
            "actors": [{"name": "Local Authority", "role": "source"}],
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["review_status"] == "draft"
    assert body["event_type"]["name"] == "Checkpoint"
    assert body["event_type"]["is_active"] is False
    assert body["sources"][0]["document_id"] == document["id"]


def test_document_becomes_completed_only_after_all_draft_events_resolved(
    tmp_path: Path,
) -> None:
    content = "Two things happened on 2026-07-10 in the capital."
    extraction = ExtractionResult(
        events=[
            ExtractedEvent(
                title="First thing",
                summary="Summary one.",
                event_type=ExtractedEventType(suggested="Report"),
                epistemic_status="confirmed",
                evidence_quote=content,
            ),
            ExtractedEvent(
                title="Second thing",
                summary="Summary two.",
                event_type=ExtractedEventType(suggested="Report"),
                epistemic_status="confirmed",
                evidence_quote=content,
            ),
        ]
    )
    client = _client(tmp_path, {content: extraction})
    document = _create_and_process_document(client, content)
    events = client.get(f"/api/documents/{document['id']}/events").json()
    assert len(events) == 2

    client.post(f"/api/events/{events[0]['id']}/approve")
    mid = client.get(f"/api/documents/{document['id']}").json()
    assert mid["processing_status"] == "ready_for_review"

    client.post(f"/api/events/{events[1]['id']}/reject")
    done = client.get(f"/api/documents/{document['id']}").json()
    assert done["processing_status"] == "completed"


def test_approve_all_skips_events_with_pending_duplicate_flags(tmp_path: Path) -> None:
    content = "Two things happened on 2026-07-10 in the capital."
    extraction = ExtractionResult(
        events=[
            ExtractedEvent(
                title="First thing",
                summary="Summary one.",
                event_type=ExtractedEventType(suggested="Report"),
                epistemic_status="confirmed",
                evidence_quote=content,
            ),
            ExtractedEvent(
                title="Second thing",
                summary="Summary two.",
                event_type=ExtractedEventType(suggested="Report"),
                epistemic_status="confirmed",
                evidence_quote=content,
            ),
        ]
    )
    client = _client(tmp_path, {content: extraction})
    app = client.app
    document = _create_and_process_document(client, content)
    events = client.get(f"/api/documents/{document['id']}/events").json()

    with app.state.session_factory() as session:
        flagged_event_id = events[0]["id"]
        flag = DuplicateFlag(
            draft_event_id=flagged_event_id,
            matched_event_id=flagged_event_id,
            matched_reason="test setup",
            resolution="pending",
        )
        session.add(flag)
        session.commit()

    response = client.post(f"/api/documents/{document['id']}/events/approve-all")
    assert response.status_code == 200
    body = response.json()
    assert events[1]["id"] in body["approved_event_ids"]
    assert events[0]["id"] not in body["approved_event_ids"]
    assert body["skipped"][0]["event_id"] == events[0]["id"]


def test_deleting_draft_event_removes_it_but_preserves_document(tmp_path: Path) -> None:
    content = "Something happened on 2026-07-10."
    extraction = ExtractionResult(
        events=[
            ExtractedEvent(
                title="Something",
                summary="Summary.",
                event_type=ExtractedEventType(suggested="Report"),
                epistemic_status="confirmed",
                evidence_quote=content,
            )
        ]
    )
    client = _client(tmp_path, {content: extraction})
    document = _create_and_process_document(client, content)
    event = client.get(f"/api/documents/{document['id']}/events").json()[0]
    assert event["review_status"] == "draft"

    response = client.delete(f"/api/events/{event['id']}")
    assert response.status_code == 204
    assert client.get(f"/api/events/{event['id']}").status_code == 404
    assert client.get(f"/api/documents/{document['id']}").status_code == 200


def test_deleting_approved_event_removes_it_but_preserves_document(tmp_path: Path) -> None:
    content = "Something happened on 2026-07-10."
    extraction = ExtractionResult(
        events=[
            ExtractedEvent(
                title="Something",
                summary="Summary.",
                event_type=ExtractedEventType(suggested="Report"),
                epistemic_status="confirmed",
                evidence_quote=content,
            )
        ]
    )
    client = _client(tmp_path, {content: extraction})
    document = _create_and_process_document(client, content)
    event = client.get(f"/api/documents/{document['id']}/events").json()[0]
    client.post(f"/api/events/{event['id']}/approve")

    response = client.delete(f"/api/events/{event['id']}")
    assert response.status_code == 204
    assert client.get(f"/api/events/{event['id']}").status_code == 404
    assert client.get(f"/api/documents/{document['id']}").status_code == 200


def test_deleting_missing_event_returns_404(tmp_path: Path) -> None:
    client = _client(tmp_path, {})
    response = client.delete("/api/events/does-not-exist")
    assert response.status_code == 404


@pytest.mark.parametrize("review_status", ["rejected", "merged"])
def test_deleting_rejected_or_merged_event_returns_409(tmp_path: Path, review_status: str) -> None:
    content = "Something happened on 2026-07-10."
    extraction = ExtractionResult(
        events=[
            ExtractedEvent(
                title="Something",
                summary="Summary.",
                event_type=ExtractedEventType(suggested="Report"),
                epistemic_status="confirmed",
                evidence_quote=content,
            )
        ]
    )
    client = _client(tmp_path, {content: extraction})
    app = client.app
    document = _create_and_process_document(client, content)
    event = client.get(f"/api/documents/{document['id']}/events").json()[0]

    with app.state.session_factory() as session:
        from app.db.models import Event as EventModel

        stored_event = session.get(EventModel, event["id"])
        stored_event.review_status = review_status
        session.commit()

    response = client.delete(f"/api/events/{event['id']}")
    assert response.status_code == 409
    assert client.get(f"/api/events/{event['id']}").status_code == 200
