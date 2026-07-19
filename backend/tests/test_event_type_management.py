from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.models import Event, EventType
from app.main import create_app


def _app(tmp_path: Path):
    return create_app(settings=Settings(data_dir=tmp_path), lm_studio_check=lambda: True)


def _seed_type_with_event(app, *, name: str, is_active: bool = True) -> str:
    factory = app.state.session_factory
    db = factory()
    try:
        event_type = EventType(name=name, is_active=is_active)
        db.add(event_type)
        db.flush()
        db.add(
            Event(
                title="Linked event",
                summary="Summary",
                epistemic_status="confirmed",
                review_status="approved",
                event_type_id=event_type.id,
            )
        )
        db.commit()
        return event_type.id
    finally:
        db.close()


def _seed_type(app, *, name: str, description: str | None = None, is_active: bool = True) -> str:
    factory = app.state.session_factory
    db = factory()
    try:
        event_type = EventType(name=name, description=description, is_active=is_active)
        db.add(event_type)
        db.commit()
        return event_type.id
    finally:
        db.close()


def test_create_event_type_route_is_retired_in_favor_of_taxonomy_nodes(tmp_path: Path) -> None:
    client = TestClient(_app(tmp_path))

    created = client.post(
        "/api/event-types",
        json={"name": "Airstrike", "description": "Use for aerial weapons strikes."},
    )
    assert created.status_code == 410


def test_rename_keeps_existing_event_links(tmp_path: Path) -> None:
    app = _app(tmp_path)
    type_id = _seed_type_with_event(app, name="Attack")
    client = TestClient(app)

    renamed = client.patch(f"/api/event-types/{type_id}", json={"name": "Armed attack"})
    assert renamed.status_code == 200
    assert renamed.json()["name"] == "Armed attack"

    factory = app.state.session_factory
    db = factory()
    try:
        event = db.query(Event).one()
        assert event.event_type_id == type_id
        assert event.event_type.name == "Armed attack"
    finally:
        db.close()


def test_rename_to_an_existing_name_conflicts(tmp_path: Path) -> None:
    app = _app(tmp_path)
    _seed_type(app, name="Protest", description="Use for public demonstrations.")
    other_id = _seed_type(app, name="Riot", description="Use for violent public disorder.")
    client = TestClient(app)

    conflict = client.patch(f"/api/event-types/{other_id}", json={"name": "protest"})
    assert conflict.status_code == 409


def test_deactivate_hides_type_from_active_extraction_list(tmp_path: Path) -> None:
    app = _app(tmp_path)
    type_id = _seed_type_with_event(app, name="Skirmish", is_active=True)
    client = TestClient(app)

    toggled = client.patch(f"/api/event-types/{type_id}", json={"is_active": False})
    assert toggled.status_code == 200
    assert toggled.json()["is_active"] is False

    # The link on the existing event survives deactivation.
    factory = app.state.session_factory
    db = factory()
    try:
        assert db.query(Event).one().event_type_id == type_id
    finally:
        db.close()

    active_names = [t["name"] for t in client.get("/api/event-types").json() if t["is_active"]]
    assert "Skirmish" not in active_names


def test_delete_unreferenced_type_succeeds_but_referenced_type_conflicts(tmp_path: Path) -> None:
    app = _app(tmp_path)
    referenced_id = _seed_type_with_event(app, name="Bombing")
    client = TestClient(app)
    unused_id = _seed_type(app, name="Unused", description="Use for an unused test type.")

    assert client.delete(f"/api/event-types/{unused_id}").status_code == 204
    assert client.delete(f"/api/event-types/{referenced_id}").status_code == 409


def test_list_reports_in_use_flag(tmp_path: Path) -> None:
    app = _app(tmp_path)
    referenced_id = _seed_type_with_event(app, name="Bombing")
    client = TestClient(app)
    unused_id = _seed_type(app, name="Unused", description="Use for an unused test type.")

    by_id = {row["id"]: row for row in client.get("/api/event-types").json()}
    assert by_id[referenced_id]["in_use"] is True
    assert by_id[unused_id]["in_use"] is False


def test_unknown_type_id_returns_404(tmp_path: Path) -> None:
    client = TestClient(_app(tmp_path))

    assert client.patch("/api/event-types/missing", json={"name": "x"}).status_code == 404
    assert client.delete("/api/event-types/missing").status_code == 404
