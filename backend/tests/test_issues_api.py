from __future__ import annotations

import uuid
from pathlib import Path

from fastapi.testclient import TestClient

from app.api.routes.issues import create_issues_router
from app.core.config import Settings
from app.main import create_app
from tests.supabase_bridge_test_support import (  # noqa: F401
    TEST_DATABASE_URL,
    bridge_db,
    require_bridge_database,
)
from tests.test_issues_service import _seed_issue


def _configured_client(tmp_path: Path) -> TestClient:
    require_bridge_database()
    app = create_app(
        settings=Settings(
            data_dir=tmp_path,
            database_url=f"sqlite:///{tmp_path / 'test.db'}",
            supabase_url=TEST_DATABASE_URL,
        ),
        lm_studio_check=lambda: False,
    )
    return TestClient(app)


def test_issues_router_exposes_only_get_routes() -> None:
    router = create_issues_router(engine=None)

    assert router.routes, "expected /api/issues routes"
    for route in router.routes:
        assert route.methods == {"GET"}, f"{route.path} exposes {route.methods}, not read-only"


def test_issue_routes_return_404_for_unknown_or_invalid_analysis_ids(tmp_path: Path, bridge_db) -> None:
    client = _configured_client(tmp_path)
    unknown_id = str(uuid.uuid4())

    assert client.get(f"/api/issues/{unknown_id}").status_code == 404
    assert client.get(f"/api/issues/{unknown_id}/events/{uuid.uuid4()}").status_code == 404


def test_issue_detail_never_includes_another_issues_event(tmp_path: Path, bridge_db) -> None:
    from datetime import UTC, datetime, timedelta

    from tests.supabase_bridge_test_support import insert_source

    now = datetime(2026, 8, 16, tzinfo=UTC)
    first_source = insert_source(bridge_db, title="First API source")
    second_source = insert_source(bridge_db, title="Second API source")
    first_issue_id, _ = _seed_issue(
        bridge_db,
        source_id=first_source,
        label="First API Issue",
        processed_at=now,
        event_titles=["First API event"],
    )
    _seed_issue(
        bridge_db,
        source_id=second_source,
        label="Second API Issue",
        processed_at=now + timedelta(minutes=1),
        event_titles=["Second API event"],
    )
    client = _configured_client(tmp_path)

    response = client.get(f"/api/issues/{first_issue_id}")

    assert response.status_code == 200
    assert [event["title"] for event in response.json()["events"]] == ["First API event"]


def test_issue_routes_return_503_when_the_read_only_database_is_unconfigured(tmp_path: Path) -> None:
    app = create_app(
        settings=Settings(data_dir=tmp_path, database_url=f"sqlite:///{tmp_path / 'test.db'}"),
        lm_studio_check=lambda: False,
    )
    client = TestClient(app)

    assert client.get("/api/issues").status_code == 503
