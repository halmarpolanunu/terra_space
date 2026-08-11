from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.models import DuplicateFlag, EventType, TaxonomyNode
from app.main import create_app


def _client(tmp_path: Path) -> TestClient:
    app = create_app(
        settings=Settings(data_dir=tmp_path, database_url=f"sqlite:///{tmp_path / 'test.db'}"),
        lm_studio_check=lambda: True,
    )
    client = TestClient(app)
    with app.state.session_factory() as db:
        domain = TaxonomyNode(name="Test domain", level="domain")
        category = TaxonomyNode(name="Test category", level="category", parent=domain)
        subcategory = TaxonomyNode(
            name="Test subcategory", level="subcategory", parent=category
        )
        attack = EventType(name="Attack", description="Use for attacks against a target.", is_active=True)
        report = EventType(name="Report", description="Use for reports of an event.", is_active=True)
        db.add_all([
            attack,
            report,
            TaxonomyNode(name="Attack", level="event_type", parent=subcategory, event_type=attack),
            TaxonomyNode(name="Report", level="event_type", parent=subcategory, event_type=report),
        ])
        db.commit()
    return client


def _create_document(client: TestClient, content: str) -> dict:
    response = client.post(
        "/api/documents",
        json={"title": content, "content": content, "publication_date": "2026-07-10"},
    )
    assert response.status_code == 201
    return response.json()


def _create_manual_event(client: TestClient, document_id: str, **overrides: object) -> dict:
    payload = {
        "document_id": document_id,
        "evidence_quote": overrides.pop("evidence_quote"),
        "title": overrides.pop("title", "An event"),
        "summary": overrides.pop("summary", "Something happened."),
        "epistemic_status": overrides.pop("epistemic_status", "confirmed"),
    }
    payload.update(overrides)
    response = client.post("/api/events", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_publishing_event_keeps_existing_type_active_and_activates_actor(tmp_path: Path) -> None:
    content = "A local militia reportedly attacked the fuel depot on 2026-07-10."
    client = _client(tmp_path)
    document = _create_document(client, content)
    event = _create_manual_event(
        client,
        document["id"],
        evidence_quote=content,
        event_type={"existing": "Attack"},
        actors=[{"name": "Local Militia", "role": "source"}],
    )

    response = client.post(f"/api/events/{event['id']}/publish")
    assert response.status_code == 200
    body = response.json()
    assert body["dashboard_status"] == "published"
    assert body["event_type"]["is_active"] is True
    assert body["actors"][0]["actor"]["is_active"] is True


def test_publish_allows_an_untyped_event(tmp_path: Path) -> None:
    content = "Something happened on 2026-07-10."
    client = _client(tmp_path)
    document = _create_document(client, content)
    event = _create_manual_event(client, document["id"], evidence_quote=content)

    response = client.post(f"/api/events/{event['id']}/publish")
    assert response.status_code == 200
    assert response.json()["event_type"] is None


def test_publishing_event_with_pending_duplicate_flag_returns_409(tmp_path: Path) -> None:
    content = "Something happened on 2026-07-10."
    client = _client(tmp_path)
    app = client.app
    document = _create_document(client, content)
    event = _create_manual_event(
        client, document["id"], evidence_quote=content, event_type={"existing": "Report"}
    )

    with app.state.session_factory() as session:
        flag = DuplicateFlag(
            event_id=event["id"],
            matched_event_id=event["id"],
            matched_reason="test setup",
            resolution="pending",
        )
        session.add(flag)
        session.commit()

    response = client.post(f"/api/events/{event['id']}/publish")
    assert response.status_code == 409


def test_rejecting_event_never_deletes_it(tmp_path: Path) -> None:
    content = "Something happened on 2026-07-10."
    client = _client(tmp_path)
    document = _create_document(client, content)
    event = _create_manual_event(
        client, document["id"], evidence_quote=content, event_type={"existing": "Report"}
    )

    response = client.post(f"/api/events/{event['id']}/reject")
    assert response.status_code == 200
    assert response.json()["dashboard_status"] == "rejected"

    still_there = client.get(f"/api/events/{event['id']}")
    assert still_there.status_code == 200
    assert still_there.json()["dashboard_status"] == "rejected"


def test_archive_and_restore_roundtrip(tmp_path: Path) -> None:
    content = "Something happened on 2026-07-10."
    client = _client(tmp_path)
    document = _create_document(client, content)
    event = _create_manual_event(client, document["id"], evidence_quote=content)

    archived = client.post(f"/api/events/{event['id']}/archive")
    assert archived.status_code == 200
    assert archived.json()["dashboard_status"] == "archived"

    restored = client.post(f"/api/events/{event['id']}/restore")
    assert restored.status_code == 200
    assert restored.json()["dashboard_status"] == "published"


def test_restore_is_not_allowed_from_hidden(tmp_path: Path) -> None:
    content = "Something happened on 2026-07-10."
    client = _client(tmp_path)
    document = _create_document(client, content)
    event = _create_manual_event(client, document["id"], evidence_quote=content)

    response = client.post(f"/api/events/{event['id']}/restore")
    assert response.status_code == 409


def test_editing_published_event_keeps_it_published(tmp_path: Path) -> None:
    content = "Something happened on 2026-07-10."
    client = _client(tmp_path)
    document = _create_document(client, content)
    event = _create_manual_event(
        client, document["id"], evidence_quote=content, event_type={"existing": "Report"}
    )
    client.post(f"/api/events/{event['id']}/publish")

    response = client.patch(
        f"/api/events/{event['id']}",
        json={
            "title": "Nope",
            "event_date": "2026-07-10",
            "event_date_precision": "exact",
        },
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Nope"
    assert response.json()["event_date"] == "2026-07-10"
    assert response.json()["dashboard_status"] == "published"
    assert response.json()["human_modified_at"] is not None
    assert set(response.json()["human_modified_fields"]) == {"title", "event_date", "event_date_precision"}


def test_manual_add_with_quote_not_in_document_is_rejected(tmp_path: Path) -> None:
    client = _client(tmp_path)
    document = client.post(
        "/api/documents",
        json={
            "title": "Field note",
            "content": "Reported a checkpoint closure near the bridge.",
            "publication_date": "2026-07-10",
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


def test_manual_add_with_valid_quote_creates_hidden_event(tmp_path: Path) -> None:
    client = _client(tmp_path)
    content = "Reported a checkpoint closure near the bridge."
    document = client.post(
        "/api/documents",
        json={"title": "Field note", "content": content, "publication_date": "2026-07-10"},
    ).json()

    response = client.post(
        "/api/events",
        json={
            "document_id": document["id"],
            "evidence_quote": "checkpoint closure near the bridge",
            "title": "Checkpoint closure",
            "summary": "A checkpoint was closed near the bridge.",
            "epistemic_status": "confirmed",
            "event_date": "2026-07-10",
            "event_date_precision": "exact",
            "event_type": {"existing": "Report"},
            "actors": [{"name": "Local Authority", "role": "source"}],
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["dashboard_status"] == "hidden"
    assert body["origin"] == "manual"
    assert body["event_type"]["name"] == "Report"
    assert body["event_type"]["is_active"] is True
    assert body["event_date"] == "2026-07-10"
    assert body["event_date_precision"] == "exact"
    assert "start_date" not in body
    assert body["sources"][0]["document_id"] == document["id"]


def test_deleting_hidden_event_removes_it_but_preserves_document(tmp_path: Path) -> None:
    content = "Something happened on 2026-07-10."
    client = _client(tmp_path)
    document = _create_document(client, content)
    event = _create_manual_event(
        client, document["id"], evidence_quote=content, event_type={"existing": "Report"}
    )
    assert event["dashboard_status"] == "hidden"

    response = client.delete(f"/api/events/{event['id']}")
    assert response.status_code == 204
    assert client.get(f"/api/events/{event['id']}").status_code == 404
    assert client.get(f"/api/documents/{document['id']}").status_code == 200


def test_deleting_published_event_removes_it_but_preserves_document(tmp_path: Path) -> None:
    content = "Something happened on 2026-07-10."
    client = _client(tmp_path)
    document = _create_document(client, content)
    event = _create_manual_event(
        client, document["id"], evidence_quote=content, event_type={"existing": "Report"}
    )
    client.post(f"/api/events/{event['id']}/publish")

    response = client.delete(f"/api/events/{event['id']}")
    assert response.status_code == 204
    assert client.get(f"/api/events/{event['id']}").status_code == 404
    assert client.get(f"/api/documents/{document['id']}").status_code == 200


def test_deleting_missing_event_returns_404(tmp_path: Path) -> None:
    client = _client(tmp_path)
    response = client.delete("/api/events/does-not-exist")
    assert response.status_code == 404


@pytest.mark.parametrize("dashboard_status", ["rejected", "merged"])
def test_deleting_rejected_or_merged_event(tmp_path: Path, dashboard_status: str) -> None:
    """`rejected` stays deletable (an owner's own decision they can still undo by deleting);
    `merged` is the one status that blocks direct edit/delete -- see
    decisions/Fresh-Phase-Prefixed-Supabase-Architecture.md."""

    content = "Something happened on 2026-07-10."
    client = _client(tmp_path)
    app = client.app
    document = _create_document(client, content)
    event = _create_manual_event(
        client, document["id"], evidence_quote=content, event_type={"existing": "Report"}
    )

    with app.state.session_factory() as session:
        from app.db.models import Event as EventModel

        stored_event = session.get(EventModel, event["id"])
        stored_event.dashboard_status = dashboard_status
        session.commit()

    response = client.delete(f"/api/events/{event['id']}")
    if dashboard_status == "merged":
        assert response.status_code == 409
        assert client.get(f"/api/events/{event['id']}").status_code == 200
    else:
        assert response.status_code == 204
        assert client.get(f"/api/events/{event['id']}").status_code == 404


def test_deleting_event_referenced_by_another_events_duplicate_flag_returns_409(
    tmp_path: Path,
) -> None:
    content = "Something happened on 2026-07-10."
    client = _client(tmp_path)
    app = client.app
    document = _create_document(client, content)
    event = _create_manual_event(client, document["id"], evidence_quote=content)
    other = _create_manual_event(client, document["id"], evidence_quote=content, title="Other")

    with app.state.session_factory() as session:
        flag = DuplicateFlag(
            event_id=other["id"],
            matched_event_id=event["id"],
            matched_reason="test setup",
            resolution="pending",
        )
        session.add(flag)
        session.commit()

    response = client.delete(f"/api/events/{event['id']}")
    assert response.status_code == 409
    assert client.get(f"/api/events/{event['id']}").status_code == 200
