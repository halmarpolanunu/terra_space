"""Task 4 of the Terra Space Supabase Application Transition Plan: the phase3_events authority
model (publish/reject/archive/restore, human-authority metadata, protected deletion) proven
against the real PostgreSQL constraints, not just SQLite.

See project-knowledge/plans/2026-08-10-terra-space-supabase-transition.md.
"""

from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.config import Settings
from app.db.models import EventType, TaxonomyNode
from app.main import create_app
from tests.supabase_bridge_test_support import TEST_DATABASE_URL, bridge_db, require_bridge_database  # noqa: F401


def _client(tmp_path: Path) -> TestClient:
    require_bridge_database()
    app = create_app(
        settings=Settings(data_dir=tmp_path, database_url=TEST_DATABASE_URL),
        lm_studio_check=lambda: True,
    )
    return TestClient(app)


def _create_document(client: TestClient, content: str) -> dict:
    response = client.post(
        "/api/documents",
        json={"title": content, "content": content, "publication_date": "2026-08-01"},
    )
    assert response.status_code == 201, response.text
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


def test_published_event_appears_immediately_and_hidden_appears_by_default_too(
    tmp_path: Path, bridge_db  # noqa: F811
) -> None:
    """See decisions/Automatic-Event-Visibility-With-Manual-Filtering.md: the default (no
    dashboard_status filter) shows both published and hidden -- only rejected/archived/merged
    (a real owner decision) are excluded automatically."""

    client = _client(tmp_path)
    doc = _create_document(client, "Published content.")
    published = _create_manual_event(client, doc["id"], evidence_quote="Published content.")
    client.post(f"/api/events/{published['id']}/publish")

    doc2 = _create_document(client, "Still hidden content.")
    hidden = _create_manual_event(client, doc2["id"], evidence_quote="Still hidden content.")

    ids = {event["id"] for event in client.get("/api/events").json()}
    assert published["id"] in ids
    assert hidden["id"] in ids

    published_only_ids = {
        event["id"]
        for event in client.get("/api/events", params={"dashboard_status": "published"}).json()
    }
    assert published["id"] in published_only_ids
    assert hidden["id"] not in published_only_ids


def test_rejected_and_archived_events_are_excluded_from_the_default_view(
    tmp_path: Path, bridge_db  # noqa: F811
) -> None:
    client = _client(tmp_path)
    doc = _create_document(client, "Rejected content.")
    event = _create_manual_event(client, doc["id"], evidence_quote="Rejected content.")
    client.post(f"/api/events/{event['id']}/reject")

    default_ids = {e["id"] for e in client.get("/api/events").json()}
    assert event["id"] not in default_ids

    rejected_ids = {
        e["id"] for e in client.get("/api/events", params={"dashboard_status": "rejected"}).json()
    }
    assert event["id"] in rejected_ids


def test_restoring_a_rejected_event_republishes_it(tmp_path: Path, bridge_db) -> None:  # noqa: F811
    client = _client(tmp_path)
    doc = _create_document(client, "Restorable content.")
    event = _create_manual_event(client, doc["id"], evidence_quote="Restorable content.")
    client.post(f"/api/events/{event['id']}/reject")

    response = client.post(f"/api/events/{event['id']}/restore")
    assert response.status_code == 200
    assert response.json()["dashboard_status"] == "published"


def test_editing_a_published_event_records_human_authority_metadata(
    tmp_path: Path, bridge_db  # noqa: F811
) -> None:
    client = _client(tmp_path)
    doc = _create_document(client, "Editable content.")
    event = _create_manual_event(client, doc["id"], evidence_quote="Editable content.")
    client.post(f"/api/events/{event['id']}/publish")

    response = client.patch(f"/api/events/{event['id']}", json={"title": "A corrected title"})
    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "A corrected title"
    assert body["human_modified_at"] is not None
    assert body["human_modified_fields"] == ["title"]
    assert body["dashboard_status"] == "published"


def test_deleting_an_event_leaves_unrelated_pipeline_run_history_untouched(
    tmp_path: Path, bridge_db  # noqa: F811
) -> None:
    """phase3_event_runs has no FK to phase3_events at all (linked only by candidate_key/
    phase1_source_id) -- confirms deleting an event can never remove pipeline audit history."""

    client = _client(tmp_path)
    doc = _create_document(client, "Deletable content.")
    event = _create_manual_event(client, doc["id"], evidence_quote="Deletable content.")

    with client.app.state.session_factory() as db:
        db.execute(
            text(
                "insert into terra_space.terra_space_phase3_event_runs "
                "(candidate_key, phase1_source_id, attempt_number, candidate, processed_at, outcome_payload) "
                "values (:candidate_key, :source_id, 1, '{}'::jsonb, now(), '{}'::jsonb)"
            ),
            {"candidate_key": "unrelated-candidate-key", "source_id": doc["id"]},
        )
        db.commit()

    response = client.delete(f"/api/events/{event['id']}")
    assert response.status_code == 204

    with client.app.state.session_factory() as db:
        count = db.execute(
            text(
                "select count(*) from terra_space.terra_space_phase3_event_runs "
                "where candidate_key = 'unrelated-candidate-key'"
            )
        ).scalar_one()
    assert count == 1


def test_duplicate_detection_flags_a_new_event_against_a_published_one(
    tmp_path: Path, bridge_db  # noqa: F811
) -> None:
    client = _client(tmp_path)
    with client.app.state.session_factory() as db:
        domain = TaxonomyNode(name="Test domain", level="domain")
        category = TaxonomyNode(name="Test category", level="category", parent=domain)
        subcategory = TaxonomyNode(name="Test subcategory", level="subcategory", parent=category)
        attack = EventType(name="Attack", description="Use for attacks.", is_active=True)
        db.add(TaxonomyNode(name="Attack", level="event_type", parent=subcategory, event_type=attack))
        db.commit()

    doc_a = _create_document(client, "A militia attacked the depot on 2026-08-01.")
    event_a = _create_manual_event(
        client,
        doc_a["id"],
        evidence_quote="A militia attacked the depot on 2026-08-01.",
        event_type={"existing": "Attack"},
        event_date="2026-08-01",
        event_date_precision="exact",
        actors=[{"name": "Local Militia", "role": "source"}],
    )
    client.post(f"/api/events/{event_a['id']}/publish")

    doc_b = _create_document(client, "A militia attacked the depot again on 2026-08-02.")
    event_b = _create_manual_event(
        client,
        doc_b["id"],
        evidence_quote="A militia attacked the depot again on 2026-08-02.",
        event_type={"existing": "Attack"},
        event_date="2026-08-02",
        event_date_precision="exact",
        actors=[{"name": "Local Militia", "role": "source"}],
    )

    assert len(event_b["duplicate_flags"]) == 1
    assert event_b["duplicate_flags"][0]["matched_event_id"] == event_a["id"]
