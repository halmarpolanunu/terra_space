from datetime import UTC, datetime
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.models import Actor, Document, Event, EventActor, EventSource, EventType, Location, Source
from app.main import create_app


def _client(tmp_path: Path) -> TestClient:
    return TestClient(create_app(settings=Settings(data_dir=tmp_path), lm_studio_check=lambda: True))


def _seed_events(client: TestClient) -> dict[str, str]:
    with client.app.state.session_factory() as session:
        airstrike = EventType(name="Airstrike", is_active=True)
        protest = EventType(name="Protest", is_active=True)
        air_force = Actor(name="Air Force", is_active=True)
        document = Document(
            title="Yemen report",
            content="Source text.",
            publication_date="2026-07-10",
            processing_status="completed",
        )
        source = Source(document=document, reference_label=document.title)
        matching = Event(
            title="Depot airstrike",
            summary="Air Force struck a depot.",
            event_date="2026-07-10",
            event_date_precision="exact",
            epistemic_status="claim",
            review_status="approved",
            approved_at=datetime.now(UTC),
            event_type=airstrike,
        )
        matching.event_actors.append(EventActor(actor=air_force, role="source"))
        matching.locations.append(
            Location(country="YE", admin1="Sana'a", latitude=15.35452, longitude=44.20646, coordinate_precision="admin1")
        )
        matching.event_sources.append(EventSource(source=source, evidence_quote="Source text."))
        other = Event(
            title="City protest",
            summary="People protested.",
            event_date="2026-07",
            event_date_precision="month",
            epistemic_status="confirmed",
            review_status="approved",
            approved_at=datetime.now(UTC),
            event_type=protest,
        )
        hidden = Event(
            title="Draft airstrike",
            summary="Not approved.",
            epistemic_status="claim",
            review_status="draft",
            event_type=airstrike,
        )
        session.add_all([matching, other, hidden])
        session.commit()
        return {"event": matching.id, "type": airstrike.id, "actor": air_force.id, "document": document.id}


def test_approved_event_query_combines_search_relation_and_date_filters(tmp_path: Path) -> None:
    client = _client(tmp_path)
    ids = _seed_events(client)

    response = client.get(
        "/api/events",
        params={
            "review_status": "approved",
            "q": "DEPOT",
            "event_type_id": ids["type"],
            "actor_id": ids["actor"],
            "country": "YE",
            "document_id": ids["document"],
            "date_from": "2026-07-01",
            "date_to": "2026-07-31",
            "sort": "date_asc",
        },
    )

    assert response.status_code == 200
    assert [event["id"] for event in response.json()] == [ids["event"]]
    assert response.json()[0]["approved_at"] is not None


def test_dashboard_summary_uses_the_same_filtered_approved_events(tmp_path: Path) -> None:
    client = _client(tmp_path)
    ids = _seed_events(client)

    response = client.get(
        "/api/events/dashboard-summary",
        params={"event_type_id": ids["type"], "country": "YE"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "total_events": 1,
        "new_events": 1,
        "by_event_type": [{"name": "Airstrike", "count": 1}],
        "incomplete_date_count": 0,
        "incomplete_location_count": 0,
    }
