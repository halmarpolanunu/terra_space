from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.models import EventType
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


def _seed_event_type(
    client: TestClient,
    *,
    name: str,
    description: str | None,
    is_active: bool,
) -> str:
    with client.app.state.session_factory() as db:
        event_type = EventType(
            name=name,
            description=description,
            is_active=is_active,
        )
        db.add(event_type)
        db.commit()
        db.refresh(event_type)
        return event_type.id


def test_create_event_type_requires_and_returns_description(tmp_path: Path) -> None:
    client = _client(tmp_path, {})
    missing = client.post("/api/event-types", json={"name": "Airstrike", "description": "   "})
    assert missing.status_code == 422

    created = client.post(
        "/api/event-types",
        json={"name": "Airstrike", "description": "Use for an aerial weapons strike."},
    )
    assert created.status_code == 201
    assert created.json()["description"] == "Use for an aerial weapons strike."


def test_inactive_type_requires_description_before_activation(tmp_path: Path) -> None:
    client = _client(tmp_path, {})
    type_id = _seed_event_type(client, name="Suggested type", description=None, is_active=False)
    response = client.patch(f"/api/event-types/{type_id}", json={"is_active": True})
    assert response.status_code == 422
    assert response.json()["detail"] == "Add a description before activating this event type."


def test_legacy_active_type_can_be_renamed_or_deactivated_without_description(
    tmp_path: Path,
) -> None:
    client = _client(tmp_path, {})
    type_id = _seed_event_type(client, name="Legacy", description=None, is_active=True)
    renamed = client.patch(f"/api/event-types/{type_id}", json={"name": "Legacy renamed"})
    assert renamed.status_code == 200
    assert renamed.json()["description"] is None
    assert client.patch(f"/api/event-types/{type_id}", json={"is_active": False}).status_code == 200


def test_legacy_active_type_can_save_rename_with_unchanged_blank_description(
    tmp_path: Path,
) -> None:
    client = _client(tmp_path, {})
    type_id = _seed_event_type(client, name="Legacy", description=None, is_active=True)
    response = client.patch(
        f"/api/event-types/{type_id}",
        json={"name": "Legacy renamed", "description": "   "},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Legacy renamed"
    assert response.json()["description"] is None
    assert response.json()["is_active"] is True


def test_active_description_cannot_be_cleared(tmp_path: Path) -> None:
    client = _client(tmp_path, {})
    created = client.post(
        "/api/event-types",
        json={"name": "Protest", "description": "Use for collective public demonstrations."},
    ).json()
    response = client.patch(f"/api/event-types/{created['id']}", json={"description": " "})
    assert response.status_code == 422


def test_event_types_and_actors_include_suggested_inactive_rows(tmp_path: Path) -> None:
    content = "A local militia reportedly attacked the fuel depot on 2026-07-10."
    extraction = ExtractionResult(
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
    client = _client(tmp_path, {content: extraction})
    document = client.post(
        "/api/documents",
        json={"title": content, "content": content, "document_date": "2026-07-10"},
    ).json()
    process_response = client.post(
        "/api/documents/process", json={"document_ids": [document["id"]]}
    )
    assert process_response.status_code == 202

    types_response = client.get("/api/event-types")
    assert types_response.status_code == 200
    types = types_response.json()
    assert len(types) == 1
    assert types[0]["name"] == "Attack"
    assert types[0]["is_active"] is False

    actors_response = client.get("/api/actors")
    assert actors_response.status_code == 200
    actors = actors_response.json()
    assert len(actors) == 1
    assert actors[0]["name"] == "Local Militia"
    assert actors[0]["is_active"] is False
