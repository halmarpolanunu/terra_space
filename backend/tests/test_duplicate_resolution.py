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
        db.add_all([
            attack,
            TaxonomyNode(name="Attack", level="event_type", parent=subcategory, event_type=attack),
        ])
        db.commit()
    return client


def _create_and_publish(client: TestClient, content: str, event_date: str) -> dict:
    document = client.post(
        "/api/documents",
        json={"title": content, "content": content, "publication_date": "2026-07-10"},
    ).json()
    event = client.post(
        "/api/events",
        json={
            "document_id": document["id"],
            "evidence_quote": content,
            "title": "Depot attack",
            "summary": "A militia group attacked a fuel depot.",
            "epistemic_status": "confirmed",
            "event_type": {"existing": "Attack"},
            "event_date": event_date,
            "event_date_precision": "exact",
            "actors": [{"name": "Local Militia", "role": "source"}],
        },
    ).json()
    published = client.post(f"/api/events/{event['id']}/publish")
    assert published.status_code == 200
    return published.json()


def _create_hidden(client: TestClient, content: str, event_date: str) -> dict:
    document = client.post(
        "/api/documents",
        json={"title": content, "content": content, "publication_date": "2026-07-10"},
    ).json()
    response = client.post(
        "/api/events",
        json={
            "document_id": document["id"],
            "evidence_quote": content,
            "title": "Depot attack",
            "summary": "A militia group attacked a fuel depot.",
            "epistemic_status": "confirmed",
            "event_type": {"existing": "Attack"},
            "event_date": event_date,
            "event_date_precision": "exact",
            "actors": [{"name": "Local Militia", "role": "source"}],
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def _setup_flagged_pair(
    client: TestClient,
    content_a: str,
    content_b: str,
    *,
    date_a: str = "2026-07-10",
    date_b: str = "2026-07-11",
) -> tuple[dict, dict]:
    """Publish an event from source A, then create an event from source B that gets
    automatically flagged as a possible duplicate of A's published event."""
    event_a = _create_and_publish(client, content_a, date_a)
    event_b = _create_hidden(client, content_b, date_b)
    assert len(event_b["duplicate_flags"]) == 1
    return event_a, event_b


def test_kept_separate_resolves_flag_without_changing_the_new_event(tmp_path: Path) -> None:
    content_a = "A local militia attacked the fuel depot on 2026-07-10."
    content_b = "A local militia attacked the fuel depot again on 2026-07-11."
    client = _client(tmp_path)
    _, event_b = _setup_flagged_pair(client, content_a, content_b)
    flag = event_b["duplicate_flags"][0]

    response = client.post(
        f"/api/events/{event_b['id']}/duplicate-flags/{flag['id']}/resolve",
        json={"resolution": "kept_separate"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["dashboard_status"] == "hidden"
    assert body["duplicate_flags"][0]["resolution"] == "kept_separate"
    assert body["duplicate_flags"][0]["resolved_at"] is not None
    assert len(body["sources"]) == 1

    publish_response = client.post(f"/api/events/{event_b['id']}/publish")
    assert publish_response.status_code == 200


def test_linked_merges_new_event_into_matched_published_event(tmp_path: Path) -> None:
    content_a = "A local militia attacked the fuel depot on 2026-07-10."
    content_b = "A local militia attacked the fuel depot again on 2026-07-11."
    client = _client(tmp_path)
    event_a, event_b = _setup_flagged_pair(client, content_a, content_b)
    flag = event_b["duplicate_flags"][0]
    assert flag["matched_event_id"] == event_a["id"]

    response = client.post(
        f"/api/events/{event_b['id']}/duplicate-flags/{flag['id']}/resolve",
        json={"resolution": "linked"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["dashboard_status"] == "merged"
    assert body["duplicate_flags"][0]["resolution"] == "linked"
    assert body["sources"] == []

    matched = client.get(f"/api/events/{event_a['id']}").json()
    assert len(matched["sources"]) == 2
    assert content_b in {source["evidence_quote"] for source in matched["sources"]}


def test_resolving_already_resolved_flag_returns_409(tmp_path: Path) -> None:
    content_a = "A local militia attacked the fuel depot on 2026-07-10."
    content_b = "A local militia attacked the fuel depot again on 2026-07-11."
    client = _client(tmp_path)
    _, event_b = _setup_flagged_pair(client, content_a, content_b)
    flag = event_b["duplicate_flags"][0]

    first = client.post(
        f"/api/events/{event_b['id']}/duplicate-flags/{flag['id']}/resolve",
        json={"resolution": "kept_separate"},
    )
    assert first.status_code == 200

    second = client.post(
        f"/api/events/{event_b['id']}/duplicate-flags/{flag['id']}/resolve",
        json={"resolution": "kept_separate"},
    )
    assert second.status_code == 409


def test_resolving_a_flag_that_belongs_to_a_different_event_returns_404(tmp_path: Path) -> None:
    content_a1 = "A local militia attacked the depot in the north on 2026-07-10."
    content_b1 = "A local militia attacked the depot in the north again on 2026-07-11."
    content_a2 = "A separate militia attacked a depot in the south on 2026-08-01."
    content_b2 = "A separate militia attacked a depot in the south again on 2026-08-02."
    client = _client(tmp_path)
    _, event_b1 = _setup_flagged_pair(client, content_a1, content_b1)
    _, event_b2 = _setup_flagged_pair(
        client, content_a2, content_b2, date_a="2026-08-01", date_b="2026-08-02"
    )
    flag_from_pair_one = event_b1["duplicate_flags"][0]

    response = client.post(
        f"/api/events/{event_b2['id']}/duplicate-flags/{flag_from_pair_one['id']}/resolve",
        json={"resolution": "kept_separate"},
    )
    assert response.status_code == 404
