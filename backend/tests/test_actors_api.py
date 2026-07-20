from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.models import Actor, Event, EventActor
from app.main import create_app


def _client(tmp_path: Path) -> TestClient:
    app = create_app(settings=Settings(data_dir=tmp_path), lm_studio_check=lambda: False)
    return TestClient(app)


def _seed_actor(client: TestClient, *, name: str, is_active: bool = True) -> str:
    with client.app.state.session_factory() as db:
        actor = Actor(name=name, is_active=is_active)
        db.add(actor)
        db.commit()
        return actor.id


def _seed_referenced_actor(client: TestClient, *, name: str) -> str:
    with client.app.state.session_factory() as db:
        actor = Actor(name=name, is_active=True)
        event = Event(
            title="Linked event",
            summary="Summary",
            epistemic_status="confirmed",
            review_status="approved",
        )
        event.event_actors.append(EventActor(actor=actor, role="source"))
        db.add(event)
        db.commit()
        return actor.id


def test_list_actor_management_reports_in_use_and_active_flags(tmp_path: Path) -> None:
    client = _client(tmp_path)
    unused_id = _seed_actor(client, name="Unused Actor")
    referenced_id = _seed_referenced_actor(client, name="Referenced Actor")

    response = client.get("/api/actor-management")

    assert response.status_code == 200
    by_id = {row["id"]: row for row in response.json()}
    assert by_id[unused_id]["in_use"] is False
    assert by_id[unused_id]["aliases"] == []
    assert by_id[referenced_id]["in_use"] is True


def test_add_and_remove_alias(tmp_path: Path) -> None:
    client = _client(tmp_path)
    actor_id = _seed_actor(client, name="United States")

    added = client.post(f"/api/actor-management/{actor_id}/aliases", json={"alias": "US"})
    assert added.status_code == 201
    alias_id = added.json()["id"]

    listed = client.get("/api/actor-management").json()
    assert [row["aliases"] for row in listed if row["id"] == actor_id][0] == [
        {"id": alias_id, "alias": "US"}
    ]

    removed = client.delete(f"/api/actor-management/{actor_id}/aliases/{alias_id}")
    assert removed.status_code == 204
    listed_after = client.get("/api/actor-management").json()
    assert [row["aliases"] for row in listed_after if row["id"] == actor_id][0] == []


def test_add_alias_conflicting_with_another_actor_name_returns_409(tmp_path: Path) -> None:
    client = _client(tmp_path)
    _seed_actor(client, name="United States")
    other_id = _seed_actor(client, name="Other Actor")

    response = client.post(
        f"/api/actor-management/{other_id}/aliases", json={"alias": "united states"}
    )

    assert response.status_code == 409


def test_rename_actor(tmp_path: Path) -> None:
    client = _client(tmp_path)
    actor_id = _seed_actor(client, name="Old Name")

    response = client.patch(f"/api/actor-management/{actor_id}", json={"name": "New Name"})

    assert response.status_code == 200
    assert response.json()["name"] == "New Name"


def test_rename_actor_conflict_returns_409(tmp_path: Path) -> None:
    client = _client(tmp_path)
    _seed_actor(client, name="Alpha")
    beta_id = _seed_actor(client, name="Beta")

    response = client.patch(f"/api/actor-management/{beta_id}", json={"name": "alpha"})

    assert response.status_code == 409


def test_activate_and_deactivate_actor(tmp_path: Path) -> None:
    client = _client(tmp_path)
    actor_id = _seed_actor(client, name="Suggested Group", is_active=False)

    activated = client.patch(f"/api/actor-management/{actor_id}", json={"is_active": True})
    assert activated.status_code == 200
    assert activated.json()["is_active"] is True

    deactivated = client.patch(f"/api/actor-management/{actor_id}", json={"is_active": False})
    assert deactivated.status_code == 200
    assert deactivated.json()["is_active"] is False


def test_delete_unreferenced_actor(tmp_path: Path) -> None:
    client = _client(tmp_path)
    actor_id = _seed_actor(client, name="Unused Actor")

    response = client.delete(f"/api/actor-management/{actor_id}")

    assert response.status_code == 204
    assert actor_id not in {row["id"] for row in client.get("/api/actor-management").json()}


def test_delete_referenced_actor_returns_409(tmp_path: Path) -> None:
    client = _client(tmp_path)
    actor_id = _seed_referenced_actor(client, name="Referenced Actor")

    response = client.delete(f"/api/actor-management/{actor_id}")

    assert response.status_code == 409


def test_actor_management_routes_404_for_a_missing_actor(tmp_path: Path) -> None:
    client = _client(tmp_path)

    assert client.patch("/api/actor-management/missing", json={"name": "X"}).status_code == 404
    assert client.delete("/api/actor-management/missing").status_code == 404
    assert (
        client.post("/api/actor-management/missing/aliases", json={"alias": "X"}).status_code
        == 404
    )
