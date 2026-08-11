from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.models import EventType, TaxonomyNode
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


def _create_document(client: TestClient, content: str, **overrides: object) -> dict:
    payload = {"title": content, "content": content, "publication_date": "2026-07-10"}
    payload.update(overrides)
    response = client.post("/api/documents", json=payload)
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


def test_manual_event_exposes_active_type_and_inactive_actor_flags(tmp_path: Path) -> None:
    content = "A local militia reportedly attacked the fuel depot near Sana'a on 2026-07-10."
    client = _client(tmp_path)
    document = _create_document(client, content)

    event = _create_manual_event(
        client,
        document["id"],
        evidence_quote=content,
        title="Depot attack",
        summary="A militia group reportedly attacked a fuel depot.",
        event_type={"existing": "Attack"},
        actors=[{"name": "Local Militia", "role": "source"}],
        locations=[{"country": "YEM", "admin1": "Sana'a", "city_regency": None}],
    )

    response = client.get(f"/api/documents/{document['id']}/events")
    assert response.status_code == 200
    events = response.json()
    assert len(events) == 1
    assert events[0]["id"] == event["id"]
    assert events[0]["dashboard_status"] == "hidden"
    assert events[0]["origin"] == "manual"
    assert events[0]["event_type"]["name"] == "Attack"
    assert events[0]["event_type"]["is_active"] is True
    assert events[0]["actors"][0]["actor"]["name"] == "Local Militia"
    assert events[0]["actors"][0]["actor"]["is_active"] is False
    assert events[0]["actors"][0]["role"] == "source"
    assert events[0]["locations"][0]["country"] == "YEM"
    assert events[0]["sources"][0]["evidence_quote"] == content
    assert events[0]["sources"][0]["document_id"] == document["id"]
    assert events[0]["duplicate_flags"] == []
    assert events[0]["extraction_incomplete"] is False
    assert events[0]["extraction_incomplete_stages"] == []


def test_list_for_document_only_returns_events_sourced_from_that_document(
    tmp_path: Path,
) -> None:
    content_a = "Event A happened at the port on 2026-07-01."
    content_b = "Event B happened at the market on 2026-07-02."
    client = _client(tmp_path)
    doc_a = _create_document(client, content_a)
    doc_b = _create_document(client, content_b)
    _create_manual_event(client, doc_a["id"], evidence_quote=content_a, title="Event A")
    _create_manual_event(client, doc_b["id"], evidence_quote=content_b, title="Event B")

    events_a = client.get(f"/api/documents/{doc_a['id']}/events").json()
    events_b = client.get(f"/api/documents/{doc_b['id']}/events").json()
    assert {event["title"] for event in events_a} == {"Event A"}
    assert {event["title"] for event in events_b} == {"Event B"}


def test_get_event_by_id_and_404_when_missing(tmp_path: Path) -> None:
    content = "Something happened on 2026-07-10."
    client = _client(tmp_path)
    document = _create_document(client, content)
    event = _create_manual_event(client, document["id"], evidence_quote=content)

    response = client.get(f"/api/events/{event['id']}")
    assert response.status_code == 200
    assert response.json()["id"] == event["id"]

    response = client.get("/api/events/does-not-exist")
    assert response.status_code == 404


def test_list_all_events_defaults_to_published_and_hidden(tmp_path: Path) -> None:
    """See decisions/Automatic-Event-Visibility-With-Manual-Filtering.md: a freshly created
    manual event starts `hidden`, and the default (no dashboard_status filter) still shows it."""

    content = "Something happened on 2026-07-10."
    client = _client(tmp_path)
    document = _create_document(client, content)
    _create_manual_event(client, document["id"], evidence_quote=content)

    response = client.get("/api/events")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["dashboard_status"] == "hidden"

    response = client.get("/api/events", params={"dashboard_status": "published"})
    assert response.status_code == 200
    assert response.json() == []
