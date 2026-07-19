from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.models import Event, EventType, TaxonomyNode
from app.main import create_app
from app.schemas.extraction import ExtractedActor, ExtractedEvent, ExtractedEventType, ExtractionResult
from app.services.lm_studio import KnownEventType

SOURCE_TEXT = "Aircraft struck the depot."


class FakeLmStudioClient:
    def __init__(self, outcomes: dict[str, ExtractionResult]) -> None:
        self._outcomes = outcomes

    def extract_events(
        self,
        document_context: object,
        known_types: list[KnownEventType],
        known_actors: list[str],
    ) -> ExtractionResult:
        return self._outcomes[document_context.content]


def _client(tmp_path: Path, outcomes: dict[str, ExtractionResult]) -> TestClient:
    app = create_app(
        settings=Settings(data_dir=tmp_path),
        lm_studio_check=lambda: True,
        lm_studio_client=FakeLmStudioClient(outcomes),
    )
    return TestClient(app)


def _process_source(client: TestClient, content: str) -> None:
    document = client.post(
        "/api/documents",
        json={"title": content, "content": content, "publication_date": "2026-07-16"},
    ).json()
    response = client.post(
        "/api/documents/process",
        json={"document_ids": [document["id"]]},
    )
    assert response.status_code == 202


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


def _seed_taxonomy_leaf(client: TestClient) -> tuple[TaxonomyNode, EventType]:
    with client.app.state.session_factory() as db:
        event_type = EventType(
            name="Armed Operation / Strike",
            description="Use for an armed operation.",
            is_active=True,
        )
        domain = TaxonomyNode(name="Security & Conflict", level="domain")
        category = TaxonomyNode(
            name="Military & Conflict Activity", level="category", parent=domain
        )
        subcategory = TaxonomyNode(name="Use of Force", level="subcategory", parent=category)
        leaf = TaxonomyNode(
            name="Armed Operation / Strike",
            level="event_type",
            parent=subcategory,
            event_type=event_type,
        )
        db.add(leaf)
        db.commit()
        db.refresh(leaf)
        db.refresh(event_type)
        return leaf, event_type


def _manual_event_payload(document_id: str, *, event_type: object | None = None) -> dict:
    payload: dict = {
        "document_id": document_id,
        "evidence_quote": "A checkpoint was closed near the bridge.",
        "title": "Checkpoint closure",
        "summary": "A checkpoint was closed near the bridge.",
        "epistemic_status": "confirmed",
    }
    if event_type is not None:
        payload["event_type"] = event_type
    return payload


def _document_for_manual_event(client: TestClient) -> dict:
    return client.post(
        "/api/documents",
        json={
            "title": "Field note",
            "content": "A checkpoint was closed near the bridge.",
            "publication_date": "2026-07-19",
        },
    ).json()


def test_taxonomy_returns_nested_nodes_and_leaf_paths(tmp_path: Path) -> None:
    client = _client(tmp_path, {})
    _seed_taxonomy_leaf(client)

    tree = client.get("/api/event-taxonomy")
    assert tree.status_code == 200
    payload = tree.json()
    assert payload[0]["level"] == "domain"
    leaf = payload[0]["children"][0]["children"][0]["children"][0]
    assert leaf["event_type"]["name"] == "Armed Operation / Strike"
    assert [segment["name"] for segment in leaf["event_type"]["taxonomy_path"]] == [
        "Security & Conflict",
        "Military & Conflict Activity",
        "Use of Force",
        "Armed Operation / Strike",
    ]


def test_taxonomy_rejects_invalid_parent_level(tmp_path: Path) -> None:
    client = _client(tmp_path, {})

    response = client.post("/api/event-taxonomy/nodes", json={"name": "Bad", "level": "event_type"})

    assert response.status_code == 422
    assert response.json()["detail"] == "An event_type node requires a subcategory parent."


def test_taxonomy_creates_only_legal_child_levels_and_active_described_leaf(tmp_path: Path) -> None:
    client = _client(tmp_path, {})
    domain = client.post("/api/event-taxonomy/nodes", json={"name": "Security", "level": "domain"})
    assert domain.status_code == 201
    category = client.post(
        "/api/event-taxonomy/nodes",
        json={"name": "Posture", "level": "category", "parent_id": domain.json()["id"]},
    )
    assert category.status_code == 201
    subcategory = client.post(
        "/api/event-taxonomy/nodes",
        json={"name": "Warning", "level": "subcategory", "parent_id": category.json()["id"]},
    )
    assert subcategory.status_code == 201

    missing_description = client.post(
        "/api/event-taxonomy/nodes",
        json={"name": "Threat", "level": "event_type", "parent_id": subcategory.json()["id"]},
    )
    assert missing_description.status_code == 422

    leaf = client.post(
        "/api/event-taxonomy/nodes",
        json={
            "name": "Threat",
            "level": "event_type",
            "parent_id": subcategory.json()["id"],
            "description": "Use for a stated security threat.",
        },
    )
    assert leaf.status_code == 201
    assert leaf.json()["event_type"]["is_active"] is True
    assert leaf.json()["event_type"]["description"] == "Use for a stated security threat."


def test_taxonomy_prevents_deleting_nodes_with_children_or_referenced_leaf(tmp_path: Path) -> None:
    client = _client(tmp_path, {})
    leaf, event_type = _seed_taxonomy_leaf(client)
    with client.app.state.session_factory() as db:
        db.add(
            Event(
                title="Referenced event",
                summary="summary",
                epistemic_status="claim",
                event_type_id=event_type.id,
            )
        )
        db.commit()
        parent_id = leaf.parent_id

    assert client.delete(f"/api/event-taxonomy/nodes/{parent_id}").status_code == 409
    assert client.delete(f"/api/event-taxonomy/nodes/{leaf.id}").status_code == 409

    with client.app.state.session_factory() as db:
        event = db.query(Event).filter_by(event_type_id=event_type.id).one()
        db.delete(event)
        db.commit()

    assert client.delete(f"/api/event-taxonomy/nodes/{leaf.id}").status_code == 204
    assert client.get("/api/event-types").json() == []


def test_taxonomy_updates_leaf_definition_through_its_node(tmp_path: Path) -> None:
    client = _client(tmp_path, {})
    leaf, _event_type = _seed_taxonomy_leaf(client)

    response = client.patch(
        f"/api/event-taxonomy/nodes/{leaf.id}",
        json={
            "name": "Armed Strike",
            "description": "Use for a reported armed strike.",
            "is_active": False,
        },
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Armed Strike"
    assert response.json()["event_type"]["name"] == "Armed Strike"
    assert response.json()["event_type"]["description"] == "Use for a reported armed strike."
    assert response.json()["event_type"]["is_active"] is False


def test_legacy_create_event_type_route_is_rejected_to_prevent_unlinked_active_types(
    tmp_path: Path,
) -> None:
    client = _client(tmp_path, {})
    response = client.post(
        "/api/event-types",
        json={"name": "Airstrike", "description": "Use for an aerial weapons strike."},
    )
    assert response.status_code == 410
    assert response.json()["detail"] == "Create Event Types through the Event Taxonomy tree."
    assert client.get("/api/event-types").json() == []


def test_legacy_event_type_rename_keeps_linked_taxonomy_leaf_in_sync(tmp_path: Path) -> None:
    client = _client(tmp_path, {})
    leaf, event_type = _seed_taxonomy_leaf(client)

    response = client.patch(f"/api/event-types/{event_type.id}", json={"name": "Armed Strike"})

    assert response.status_code == 200
    assert response.json()["name"] == "Armed Strike"
    taxonomy = client.get("/api/event-taxonomy").json()
    assert taxonomy[0]["children"][0]["children"][0]["children"][0]["id"] == leaf.id
    assert taxonomy[0]["children"][0]["children"][0]["children"][0]["name"] == "Armed Strike"
    assert taxonomy[0]["children"][0]["children"][0]["children"][0]["event_type"]["taxonomy_path"][-1]["name"] == "Armed Strike"


def test_legacy_event_type_delete_is_blocked_when_linked_to_taxonomy_leaf(tmp_path: Path) -> None:
    client = _client(tmp_path, {})
    _leaf, event_type = _seed_taxonomy_leaf(client)

    response = client.delete(f"/api/event-types/{event_type.id}")

    assert response.status_code == 409
    assert response.json()["detail"] == "Delete this Event Type through its Event Taxonomy leaf."


def test_inactive_type_requires_description_before_activation(tmp_path: Path) -> None:
    client = _client(tmp_path, {})
    type_id = _seed_event_type(client, name="Suggested type", description=None, is_active=False)
    response = client.patch(f"/api/event-types/{type_id}", json={"is_active": True})
    assert response.status_code == 422
    assert response.json()["detail"] == "Add a description before activating this event type."


def test_legacy_unlinked_event_type_cannot_be_activated_through_legacy_patch(tmp_path: Path) -> None:
    client = _client(tmp_path, {})
    type_id = _seed_event_type(
        client,
        name="Legacy inactive type",
        description="A legacy type outside the taxonomy.",
        is_active=False,
    )

    response = client.patch(f"/api/event-types/{type_id}", json={"is_active": True})

    assert response.status_code == 422
    assert response.json()["detail"] == "Activate Event Types through an Event Taxonomy leaf."


def test_manual_event_type_requires_an_active_taxonomy_leaf(tmp_path: Path) -> None:
    client = _client(tmp_path, {})
    document = _document_for_manual_event(client)
    _seed_event_type(
        client,
        name="Legacy type",
        description="A legacy Event Type outside the tree.",
        is_active=True,
    )

    response = client.post(
        "/api/events",
        json=_manual_event_payload(document["id"], event_type={"existing": "Legacy type"}),
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Choose an active Event Type leaf from the Event Taxonomy."


def test_manual_event_accepts_a_linked_leaf_and_leaves_type_blank_when_omitted(
    tmp_path: Path,
) -> None:
    client = _client(tmp_path, {})
    _leaf, event_type = _seed_taxonomy_leaf(client)
    document = _document_for_manual_event(client)

    typed = client.post(
        "/api/events",
        json=_manual_event_payload(
            document["id"], event_type={"existing": event_type.name}
        ),
    )
    blank = client.post("/api/events", json=_manual_event_payload(document["id"]))

    assert typed.status_code == 201
    assert typed.json()["event_type"]["id"] == event_type.id
    assert blank.status_code == 201
    assert blank.json()["event_type"] is None


def test_manual_event_type_rejects_legacy_suggested_field(tmp_path: Path) -> None:
    client = _client(tmp_path, {})
    document = _document_for_manual_event(client)

    response = client.post(
        "/api/events",
        json=_manual_event_payload(document["id"], event_type={"suggested": "Airstrike"}),
    )

    assert response.status_code == 422


def test_event_update_rejects_unknown_type_and_allows_an_explicit_blank_type(
    tmp_path: Path,
) -> None:
    client = _client(tmp_path, {})
    _leaf, event_type = _seed_taxonomy_leaf(client)
    document = _document_for_manual_event(client)
    event = client.post(
        "/api/events",
        json=_manual_event_payload(
            document["id"], event_type={"existing": event_type.name}
        ),
    ).json()

    rejected = client.patch(
        f"/api/events/{event['id']}", json={"event_type": {"existing": "Unknown type"}}
    )
    cleared = client.patch(f"/api/events/{event['id']}", json={"event_type": None})

    assert rejected.status_code == 422
    assert rejected.json()["detail"] == "Choose an active Event Type leaf from the Event Taxonomy."
    assert cleared.status_code == 200
    assert cleared.json()["event_type"] is None


def test_approval_cannot_activate_an_unlinked_event_type(tmp_path: Path) -> None:
    client = _client(tmp_path, {})
    document = _document_for_manual_event(client)
    event = client.post("/api/events", json=_manual_event_payload(document["id"])).json()
    type_id = _seed_event_type(
        client,
        name="Legacy inactive type",
        description="A legacy Event Type outside the tree.",
        is_active=False,
    )
    with client.app.state.session_factory() as db:
        persisted_event = db.get(Event, event["id"])
        assert persisted_event is not None
        persisted_event.event_type_id = type_id
        db.commit()

    response = client.post(f"/api/events/{event['id']}/approve")

    assert response.status_code == 422
    assert response.json()["detail"] == "Choose an active Event Type leaf from the Event Taxonomy."


def test_approval_rejects_an_active_event_type_outside_the_taxonomy(tmp_path: Path) -> None:
    client = _client(tmp_path, {})
    document = _document_for_manual_event(client)
    event = client.post("/api/events", json=_manual_event_payload(document["id"])).json()
    type_id = _seed_event_type(
        client,
        name="Legacy active type",
        description="A legacy Event Type outside the tree.",
        is_active=True,
    )
    with client.app.state.session_factory() as db:
        persisted_event = db.get(Event, event["id"])
        assert persisted_event is not None
        persisted_event.event_type_id = type_id
        db.commit()

    response = client.post(f"/api/events/{event['id']}/approve")

    assert response.status_code == 422
    assert response.json()["detail"] == "Choose an active Event Type leaf from the Event Taxonomy."


def test_approve_all_skips_an_inactive_taxonomy_leaf(tmp_path: Path) -> None:
    client = _client(tmp_path, {})
    _leaf, event_type = _seed_taxonomy_leaf(client)
    document = _document_for_manual_event(client)
    event = client.post("/api/events", json=_manual_event_payload(document["id"])).json()
    with client.app.state.session_factory() as db:
        persisted_event = db.get(Event, event["id"])
        persisted_type = db.get(EventType, event_type.id)
        assert persisted_event is not None
        assert persisted_type is not None
        persisted_event.event_type_id = event_type.id
        persisted_type.is_active = False
        db.commit()

    response = client.post(f"/api/documents/{document['id']}/events/approve-all")

    assert response.status_code == 200
    assert response.json()["approved_event_ids"] == []
    assert response.json()["skipped"] == [
        {
            "event_id": event["id"],
            "reason": "Event type is not an active Event Taxonomy leaf.",
        }
    ]


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
    type_id = _seed_event_type(
        client,
        name="Protest",
        description="Use for collective public demonstrations.",
        is_active=True,
    )
    response = client.patch(f"/api/event-types/{type_id}", json={"description": " "})
    assert response.status_code == 422


def test_unknown_ai_type_creates_no_event_type_but_keeps_the_draft_untyped(tmp_path: Path) -> None:
    content = "A local militia reportedly attacked the fuel depot on 2026-07-10."
    extraction = ExtractionResult(
        events=[
            ExtractedEvent(
                title="Depot attack",
                summary="A militia group reportedly attacked a fuel depot.",
                event_type=ExtractedEventType(existing="Attack"),
                epistemic_status="claim",
                evidence_quote=content,
                actors=[ExtractedActor(name="Local Militia", role="source", existing=False)],
            )
        ]
    )
    client = _client(tmp_path, {content: extraction})
    document = client.post(
        "/api/documents",
        json={"title": content, "content": content, "publication_date": "2026-07-10"},
    ).json()
    process_response = client.post(
        "/api/documents/process", json={"document_ids": [document["id"]]}
    )
    assert process_response.status_code == 202

    types_response = client.get("/api/event-types")
    assert types_response.status_code == 200
    assert types_response.json() == []

    events = client.get(f"/api/documents/{document['id']}/events").json()
    assert events[0]["event_type"] is None

    actors_response = client.get("/api/actors")
    assert actors_response.status_code == 200
    actors = actors_response.json()
    assert len(actors) == 1
    assert actors[0]["name"] == "Local Militia"
    assert actors[0]["is_active"] is False


def test_ai_output_uses_an_active_existing_type_without_changing_its_definition(tmp_path: Path) -> None:
    content = "People held a public protest."
    extraction = ExtractionResult(
        events=[
            ExtractedEvent(
                title="Public protest",
                summary=content,
                event_type=ExtractedEventType(existing="Protest"),
                epistemic_status="confirmed",
                evidence_quote=content,
            )
        ]
    )
    client = _client(tmp_path, {content: extraction})
    existing_id = _seed_event_type(
        client, name="Protest", description="Human definition.", is_active=True
    )
    with client.app.state.session_factory() as db:
        event_type = db.get(EventType, existing_id)
        assert event_type is not None
        domain = TaxonomyNode(name="Civic", level="domain")
        category = TaxonomyNode(name="Public activity", level="category", parent=domain)
        subcategory = TaxonomyNode(name="Demonstrations", level="subcategory", parent=category)
        db.add(
            TaxonomyNode(
                name="Protest",
                level="event_type",
                parent=subcategory,
                event_type=event_type,
            )
        )
        db.commit()

    _process_source(client, content)

    rows = client.get("/api/event-types").json()
    assert len(rows) == 1
    assert rows[0]["id"] == existing_id
    assert rows[0]["description"] == "Human definition."
    assert rows[0]["in_use"] is True
