from pathlib import Path

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.models import Actor, ActorAlias, Event, EventActor
from app.db.session import configure_sqlite_connection
from app.services.actors import (
    ActorAliasConflictError,
    ActorInUseError,
    ActorNameConflictError,
    add_actor_alias,
    delete_actor,
    remove_actor_alias,
    update_actor,
)


def _session(tmp_path: Path) -> Session:
    engine = create_engine(f"sqlite:///{tmp_path / 'terra-space.db'}")
    configure_sqlite_connection(engine)
    Base.metadata.create_all(engine)
    return Session(engine)


def test_add_actor_alias_persists_it(tmp_path: Path) -> None:
    session = _session(tmp_path)
    actor = Actor(name="United States", is_active=True)
    session.add(actor)
    session.commit()

    alias = add_actor_alias(session, actor, "US")

    assert alias.alias == "US"
    session.refresh(actor)
    assert [a.alias for a in actor.aliases] == ["US"]


def test_add_actor_alias_rejects_blank_alias(tmp_path: Path) -> None:
    session = _session(tmp_path)
    actor = Actor(name="United States", is_active=True)
    session.add(actor)
    session.commit()

    with pytest.raises(ActorAliasConflictError):
        add_actor_alias(session, actor, "   ")


def test_add_actor_alias_rejects_a_match_against_another_actors_canonical_name(
    tmp_path: Path,
) -> None:
    session = _session(tmp_path)
    us = Actor(name="United States", is_active=True)
    other = Actor(name="Other Actor", is_active=True)
    session.add_all([us, other])
    session.commit()

    with pytest.raises(ActorAliasConflictError):
        add_actor_alias(session, other, "united states")


def test_add_actor_alias_rejects_a_duplicate_alias_across_actors_case_insensitively(
    tmp_path: Path,
) -> None:
    session = _session(tmp_path)
    us = Actor(name="United States", is_active=True)
    other = Actor(name="Other Actor", is_active=True)
    session.add_all([us, other])
    session.commit()
    add_actor_alias(session, us, "US")

    with pytest.raises(ActorAliasConflictError):
        add_actor_alias(session, other, "us")


def test_remove_actor_alias_deletes_it(tmp_path: Path) -> None:
    session = _session(tmp_path)
    actor = Actor(name="United States", is_active=True)
    session.add(actor)
    session.commit()
    alias = add_actor_alias(session, actor, "US")

    remove_actor_alias(session, alias)

    assert session.get(ActorAlias, alias.id) is None


def test_update_actor_renames(tmp_path: Path) -> None:
    session = _session(tmp_path)
    actor = Actor(name="Old Name", is_active=True)
    session.add(actor)
    session.commit()

    updated = update_actor(session, actor, name="New Name")

    assert updated.name == "New Name"


def test_update_actor_rejects_a_name_conflict_with_another_actor(tmp_path: Path) -> None:
    session = _session(tmp_path)
    first = Actor(name="Alpha", is_active=True)
    second = Actor(name="Beta", is_active=True)
    session.add_all([first, second])
    session.commit()

    with pytest.raises(ActorNameConflictError):
        update_actor(session, second, name="alpha")


def test_update_actor_toggles_active(tmp_path: Path) -> None:
    session = _session(tmp_path)
    actor = Actor(name="Suggested Group", is_active=False)
    session.add(actor)
    session.commit()

    updated = update_actor(session, actor, is_active=True)

    assert updated.is_active is True


def test_delete_actor_removes_an_unreferenced_actor(tmp_path: Path) -> None:
    session = _session(tmp_path)
    actor = Actor(name="Unused Actor", is_active=True)
    session.add(actor)
    session.commit()

    delete_actor(session, actor)

    assert session.execute(select(Actor)).scalars().all() == []


def test_delete_actor_refuses_when_referenced_by_an_event(tmp_path: Path) -> None:
    session = _session(tmp_path)
    actor = Actor(name="Referenced Actor", is_active=True)
    event = Event(
        title="Event", summary="Summary", epistemic_status="confirmed", review_status="draft"
    )
    event.event_actors.append(EventActor(actor=actor, role="source"))
    session.add(event)
    session.commit()

    with pytest.raises(ActorInUseError):
        delete_actor(session, actor)

    assert session.get(Actor, actor.id) is not None


def test_deleting_actor_cascades_to_its_aliases(tmp_path: Path) -> None:
    session = _session(tmp_path)
    actor = Actor(name="Unused Actor", is_active=True)
    session.add(actor)
    session.commit()
    add_actor_alias(session, actor, "UA")

    delete_actor(session, actor)

    assert session.execute(select(ActorAlias)).scalars().all() == []
