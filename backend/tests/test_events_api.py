from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.models import EventType
from app.main import create_app
from app.schemas.extraction import (
    ExtractedActor,
    ExtractedEvent,
    ExtractedEventType,
    ExtractedLocation,
    ExtractionResult,
)
from app.services.lm_studio import KnownEventType


class FakeLmStudioClient:
    """Test double standing in for LmStudioClient.extract_events."""

    def __init__(self, outcomes: dict[str, ExtractionResult]) -> None:
        self._outcomes = outcomes
        self.known_types_seen: list[KnownEventType] = []

    def extract_events(
        self,
        document_text: str,
        known_types: list[KnownEventType],
        known_actors: list[str],
    ) -> ExtractionResult:
        self.known_types_seen = known_types
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


def test_processing_passes_only_active_event_type_definitions(tmp_path: Path) -> None:
    content = "A public protest occurred."
    fake = FakeLmStudioClient({content: ExtractionResult(events=[])})
    app = create_app(
        settings=Settings(data_dir=tmp_path),
        lm_studio_check=lambda: True,
        lm_studio_client=fake,
    )
    client = TestClient(app)
    client.post(
        "/api/event-types",
        json={"name": "Protest", "description": "Collective public demonstration."},
    )
    with app.state.session_factory() as db:
        db.add(EventType(name="Unused suggestion", description=None, is_active=False))
        db.commit()
    document = client.post(
        "/api/documents",
        json={"title": content, "content": content, "document_date": "2026-07-16"},
    ).json()
    client.post("/api/documents/process", json={"document_ids": [document["id"]]})

    assert fake.known_types_seen == [
        KnownEventType(
            name="Protest",
            description="Collective public demonstration.",
        )
    ]


def test_events_for_document_expose_suggested_type_and_actor_flags(tmp_path: Path) -> None:
    content = "A local militia reportedly attacked the fuel depot near Sana'a on 2026-07-10."
    extraction = ExtractionResult(
        events=[
            ExtractedEvent(
                title="Depot attack",
                summary="A militia group reportedly attacked a fuel depot.",
                event_type=ExtractedEventType(suggested="Attack"),
                epistemic_status="claim",
                evidence_quote=content,
                actors=[ExtractedActor(name="Local Militia", role="source", existing=False)],
                locations=[ExtractedLocation(country="YE", admin1="Sana'a", city_regency=None)],
            )
        ]
    )
    client = _client(tmp_path, {content: extraction})
    document = _create_and_process_document(client, content)

    response = client.get(f"/api/documents/{document['id']}/events")
    assert response.status_code == 200
    events = response.json()
    assert len(events) == 1
    event = events[0]
    assert event["review_status"] == "draft"
    assert event["event_type"]["name"] == "Attack"
    assert event["event_type"]["is_active"] is False
    assert event["actors"][0]["actor"]["name"] == "Local Militia"
    assert event["actors"][0]["actor"]["is_active"] is False
    assert event["actors"][0]["role"] == "source"
    assert event["locations"][0]["country"] == "YE"
    assert event["sources"][0]["evidence_quote"] == content
    assert event["sources"][0]["document_id"] == document["id"]
    assert event["duplicate_flags"] == []


def test_list_for_document_only_returns_events_sourced_from_that_document(
    tmp_path: Path,
) -> None:
    content_a = "Event A happened at the port on 2026-07-01."
    content_b = "Event B happened at the market on 2026-07-02."
    extraction_a = ExtractionResult(
        events=[
            ExtractedEvent(
                title="Event A",
                summary="Summary A.",
                event_type=ExtractedEventType(suggested="Report"),
                epistemic_status="confirmed",
                evidence_quote=content_a,
            )
        ]
    )
    extraction_b = ExtractionResult(
        events=[
            ExtractedEvent(
                title="Event B",
                summary="Summary B.",
                event_type=ExtractedEventType(suggested="Report"),
                epistemic_status="confirmed",
                evidence_quote=content_b,
            )
        ]
    )
    client = _client(tmp_path, {content_a: extraction_a, content_b: extraction_b})
    doc_a = _create_and_process_document(client, content_a)
    doc_b = _create_and_process_document(client, content_b)

    events_a = client.get(f"/api/documents/{doc_a['id']}/events").json()
    events_b = client.get(f"/api/documents/{doc_b['id']}/events").json()
    assert {event["title"] for event in events_a} == {"Event A"}
    assert {event["title"] for event in events_b} == {"Event B"}


def test_get_event_by_id_and_404_when_missing(tmp_path: Path) -> None:
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
    events = client.get(f"/api/documents/{document['id']}/events").json()

    response = client.get(f"/api/events/{events[0]['id']}")
    assert response.status_code == 200
    assert response.json()["id"] == events[0]["id"]

    response = client.get("/api/events/does-not-exist")
    assert response.status_code == 404


def test_list_all_events_filters_by_review_status(tmp_path: Path) -> None:
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
    _create_and_process_document(client, content)

    response = client.get("/api/events", params={"review_status": "draft"})
    assert response.status_code == 200
    assert len(response.json()) == 1

    response = client.get("/api/events", params={"review_status": "approved"})
    assert response.status_code == 200
    assert response.json() == []
