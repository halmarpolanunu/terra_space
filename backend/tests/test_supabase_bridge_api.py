from pathlib import Path

from fastapi.testclient import TestClient

from app.api.routes.supabase_bridge import create_supabase_bridge_router
from app.core.config import Settings
from app.main import create_app
from tests.supabase_bridge_test_support import (  # noqa: F401
    TEST_DATABASE_URL,
    bridge_db,
    insert_actor,
    insert_candidate_result,
    insert_event,
    insert_event_type,
    insert_source,
    require_bridge_database,
)


def _configured_client(tmp_path: Path) -> TestClient:
    require_bridge_database()
    app = create_app(
        settings=Settings(data_dir=tmp_path, database_url=f"sqlite:///{tmp_path / 'test.db'}", supabase_url=TEST_DATABASE_URL),
        lm_studio_check=lambda: False,
    )
    return TestClient(app)


def _unconfigured_client(tmp_path: Path) -> TestClient:
    app = create_app(settings=Settings(data_dir=tmp_path, database_url=f"sqlite:///{tmp_path / 'test.db'}"), lm_studio_check=lambda: False)
    return TestClient(app)


def test_bridge_router_exposes_only_get_routes() -> None:
    router = create_supabase_bridge_router(engine=None)

    assert router.routes, "expected at least one /api/bridge route to be registered"
    for route in router.routes:
        assert route.methods == {"GET"}, f"{route.path} exposes {route.methods}, not read-only"


def test_mode_reports_unconfigured_when_no_supabase_url(tmp_path: Path) -> None:
    client = _unconfigured_client(tmp_path)

    response = client.get("/api/bridge/mode")

    assert response.status_code == 200
    body = response.json()
    assert body["configured"] is False


def test_routes_return_503_when_unconfigured(tmp_path: Path) -> None:
    client = _unconfigured_client(tmp_path)

    for path in ("/api/bridge/sources", "/api/bridge/event-candidates", "/api/bridge/events"):
        response = client.get(path)
        assert response.status_code == 503, path


def test_mode_reports_configured_against_the_test_database(tmp_path: Path, bridge_db) -> None:
    client = _configured_client(tmp_path)

    response = client.get("/api/bridge/mode")

    assert response.status_code == 200
    assert response.json()["configured"] is True


def test_sources_route_returns_inserted_rows(tmp_path: Path, bridge_db) -> None:
    insert_source(bridge_db, title="API test source")
    client = _configured_client(tmp_path)

    response = client.get("/api/bridge/sources")

    assert response.status_code == 200
    titles = [row["title"] for row in response.json()]
    assert "API test source" in titles


def test_source_detail_route_404_for_unknown_id(tmp_path: Path, bridge_db) -> None:
    client = _configured_client(tmp_path)

    response = client.get("/api/bridge/sources/00000000-0000-0000-0000-000000000000")

    assert response.status_code == 404


def test_event_candidates_route_returns_pipeline_output(tmp_path: Path, bridge_db) -> None:
    source_id = insert_source(bridge_db, title="Candidate source")
    insert_candidate_result(bridge_db, source_id)
    client = _configured_client(tmp_path)

    response = client.get("/api/bridge/event-candidates")

    assert response.status_code == 200
    [review] = response.json()
    assert review["phase1_source_id"] == source_id
    assert review["event_candidates"][0]["working_title"] == "Test candidate"


def test_events_route_returns_published_events_with_full_epistemic_range(
    tmp_path: Path, bridge_db
) -> None:
    source_id = insert_source(bridge_db)
    insert_event(bridge_db, source_id, title="Unknown-status event", epistemic_status="unknown")
    client = _configured_client(tmp_path)

    response = client.get("/api/bridge/events")

    assert response.status_code == 200
    [event] = response.json()
    assert event["epistemic_status"] == "unknown"
    assert event["dashboard_status"] == "published"


def test_event_detail_route_returns_hidden_event_marked_as_exception(
    tmp_path: Path, bridge_db
) -> None:
    """A hidden (EXCEPTION) event is now visible, not a 404 -- see
    decisions/Automatic-Event-Visibility-With-Manual-Filtering.md."""

    source_id = insert_source(bridge_db)
    hidden_id = insert_event(
        bridge_db, source_id, dashboard_status="hidden", pipeline_outcome="EXCEPTION"
    )
    client = _configured_client(tmp_path)

    response = client.get(f"/api/bridge/events/{hidden_id}")

    assert response.status_code == 200
    body = response.json()
    assert body["dashboard_status"] == "hidden"
    assert body["pipeline_outcome"] == "EXCEPTION"


def test_event_detail_route_404_for_rejected_event(tmp_path: Path, bridge_db) -> None:
    source_id = insert_source(bridge_db)
    rejected_id = insert_event(bridge_db, source_id, dashboard_status="rejected")
    client = _configured_client(tmp_path)

    response = client.get(f"/api/bridge/events/{rejected_id}")

    assert response.status_code == 404


def test_events_route_returns_hidden_events_by_default(tmp_path: Path, bridge_db) -> None:
    source_id = insert_source(bridge_db)
    insert_event(bridge_db, source_id, dashboard_status="published", title="Published")
    insert_event(bridge_db, source_id, dashboard_status="hidden", title="Hidden")
    client = _configured_client(tmp_path)

    response = client.get("/api/bridge/events")

    assert response.status_code == 200
    assert {row["title"] for row in response.json()} == {"Published", "Hidden"}


def test_events_route_dashboard_status_filter_narrows_the_view(tmp_path: Path, bridge_db) -> None:
    source_id = insert_source(bridge_db)
    insert_event(bridge_db, source_id, dashboard_status="published", title="Published")
    insert_event(bridge_db, source_id, dashboard_status="hidden", title="Hidden")
    client = _configured_client(tmp_path)

    published_only = client.get("/api/bridge/events", params={"dashboard_status": "published"})
    hidden_only = client.get("/api/bridge/events", params={"dashboard_status": "hidden"})

    assert [row["title"] for row in published_only.json()] == ["Published"]
    assert [row["title"] for row in hidden_only.json()] == ["Hidden"]


def test_dashboard_summary_route_counts_exceptions(tmp_path: Path, bridge_db) -> None:
    source_id = insert_source(bridge_db)
    insert_event(bridge_db, source_id, dashboard_status="published", pipeline_outcome="FINAL")
    insert_event(bridge_db, source_id, dashboard_status="hidden", pipeline_outcome="EXCEPTION")
    client = _configured_client(tmp_path)

    response = client.get("/api/bridge/events/dashboard-summary")

    assert response.status_code == 200
    body = response.json()
    assert body["total_events"] == 2
    assert body["exception_count"] == 1


def test_dashboard_summary_route(tmp_path: Path, bridge_db) -> None:
    source_id = insert_source(bridge_db)
    type_id = insert_event_type(bridge_db, "War")
    insert_event(bridge_db, source_id, event_type_id=type_id)
    client = _configured_client(tmp_path)

    response = client.get("/api/bridge/events/dashboard-summary")

    assert response.status_code == 200
    body = response.json()
    assert body["total_events"] == 1
    assert body["by_event_type"] == [{"name": "War", "count": 1}]


def test_event_types_and_actors_routes(tmp_path: Path, bridge_db) -> None:
    insert_event_type(bridge_db, "Military Mobilization")
    insert_actor(bridge_db, "Test Actor")
    client = _configured_client(tmp_path)

    types_response = client.get("/api/bridge/event-types")
    actors_response = client.get("/api/bridge/actors")

    assert [t["name"] for t in types_response.json()] == ["Military Mobilization"]
    assert [a["name"] for a in actors_response.json()] == ["Test Actor"]
