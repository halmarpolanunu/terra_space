from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.models import Document, Event, EventSource, EventType, Source, TaxonomyNode
from app.main import create_app
from app.services.extraction import run_staged_pipeline
from app.services.lm_studio import KnownEventType, LmStudioResponseError
from tests.staged_lm_studio_fake import FakeEventSpec, FakeLmStudioClient


def _extraction_for(content: str) -> list[FakeEventSpec]:
    return [
        FakeEventSpec(
            title="Extracted event",
            summary="Summary.",
            evidence_quote=content,
        )
    ]


def _client(
    tmp_path: Path, outcomes: dict[str, list[FakeEventSpec] | Exception]
) -> TestClient:
    app = create_app(
        settings=Settings(data_dir=tmp_path),
        lm_studio_check=lambda: True,
        lm_studio_client=FakeLmStudioClient(outcomes),
    )
    return TestClient(app)


def _create_document(client: TestClient, content: str) -> dict:
    response = client.post(
        "/api/documents",
        json={"title": content, "content": content, "publication_date": "2026-07-10"},
    )
    assert response.status_code == 201
    return response.json()


def test_processing_passes_document_metadata_to_lm_studio(tmp_path: Path) -> None:
    content = "Evidence text."
    fake_client = FakeLmStudioClient({content: _extraction_for(content)})
    app = create_app(
        settings=Settings(data_dir=tmp_path),
        lm_studio_check=lambda: True,
        lm_studio_client=fake_client,
    )
    client = TestClient(app)
    response = client.post(
        "/api/documents",
        json={
            "title": "Naval blockade update",
            "content": content,
            "publication_date": "2026-07-12",
        },
    )
    document = response.json()

    processed = client.post("/api/documents/process", json={"document_ids": [document["id"]]})

    assert processed.status_code == 202
    context = fake_client.calls[0]
    assert getattr(context, "title", None) == "Naval blockade update"
    assert getattr(context, "publication_date", None) == "2026-07-12"
    assert getattr(context, "content", None) == content


def test_processing_sends_only_active_taxonomy_leaves_with_full_paths_to_lm_studio(
    tmp_path: Path,
) -> None:
    content = "A military unit mobilized."
    fake_client = FakeLmStudioClient({content: _extraction_for(content)})
    app = create_app(
        settings=Settings(data_dir=tmp_path), lm_studio_check=lambda: True, lm_studio_client=fake_client
    )
    client = TestClient(app)
    document = _create_document(client, content)

    with app.state.session_factory() as session:
        linked_type = EventType(
            name="Military Mobilization", description="Use for a military buildup.", is_active=True
        )
        legacy_type = EventType(
            name="Legacy Active Type", description="Never offer this to AI.", is_active=True
        )
        inactive_type = EventType(
            name="Inactive Leaf", description="Do not offer inactive leaves.", is_active=False
        )
        domain = TaxonomyNode(name="Security & Conflict", level="domain")
        category = TaxonomyNode(name="Signalling & Posture", level="category", parent=domain)
        subcategory = TaxonomyNode(name="Military Readiness", level="subcategory", parent=category)
        linked_leaf = TaxonomyNode(
            name="Military Mobilization", level="event_type", parent=subcategory, event_type=linked_type
        )
        inactive_leaf = TaxonomyNode(
            name="Inactive Leaf", level="event_type", parent=subcategory, event_type=inactive_type
        )
        session.add_all([legacy_type, linked_leaf, inactive_leaf])
        session.commit()

    response = client.post("/api/documents/process", json={"document_ids": [document["id"]]})

    assert response.status_code == 202
    assert fake_client.known_type_calls == [
        [
            KnownEventType(
                name="Military Mobilization",
                description="Use for a military buildup.",
                path="Security & Conflict > Signalling & Posture > Military Readiness > Military Mobilization",
            )
        ]
    ]


def test_persisting_extraction_leaves_malformed_taxonomy_leaf_untyped(tmp_path: Path) -> None:
    """AI output cannot assign a leaf unless its complete taxonomy path exists."""
    content = "A military unit mobilized."
    client = _client(tmp_path, {})
    app = client.app
    document_payload = _create_document(client, content)

    with app.state.session_factory() as session:
        document = session.get(Document, document_payload["id"])
        assert document is not None
        event_type = EventType(
            name="Malformed Leaf", description="This leaf has the wrong parent.", is_active=True
        )
        domain = TaxonomyNode(name="Security & Conflict", level="domain")
        malformed_leaf = TaxonomyNode(
            name="Malformed Leaf", level="event_type", parent=domain, event_type=event_type
        )
        session.add(malformed_leaf)
        session.commit()

        fake_client = FakeLmStudioClient(
            {
                content: [
                    FakeEventSpec(
                        title="Mobilization",
                        summary="A military unit mobilized.",
                        evidence_quote=content,
                        event_type="Malformed Leaf",
                    )
                ]
            }
        )
        result = run_staged_pipeline(session, document, fake_client, [], [])

        assert len(result.saved_events) == 1
        assert result.saved_events[0].event_type is None


def test_batch_where_second_document_fails_still_completes_first_and_third(
    tmp_path: Path,
) -> None:
    contents = ["First document body.", "Second document body.", "Third document body."]
    outcomes: dict[str, list[FakeEventSpec] | Exception] = {
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
