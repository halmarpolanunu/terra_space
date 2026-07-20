"""Actor management: rename, activate/deactivate, delete when unreferenced, and manage
owner-supplied aliases. Mirrors the rename/activate-deactivate/delete-when-unreferenced
rules already established for Event Types."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Actor, ActorAlias, EventActor
from app.schemas.actor import ActorAliasRead, ActorManagementRead

_UNSET = object()


class ActorNameConflictError(Exception):
    """Raised when renaming an actor to a name another actor already has."""


class ActorAliasConflictError(Exception):
    """Raised for a blank alias, or one that collides with a name/alias in use elsewhere."""


class ActorInUseError(Exception):
    """Raised when deleting an actor still referenced by an event."""


def _normalize(value: str) -> str:
    return value.strip().casefold()


def list_actors_for_management(db: Session) -> list[Actor]:
    return list(db.execute(select(Actor).order_by(Actor.name)).scalars())


def referenced_actor_ids(db: Session) -> set[str]:
    return {row[0] for row in db.execute(select(EventActor.actor_id).distinct())}


def to_actor_management_read(actor: Actor, *, in_use: bool) -> ActorManagementRead:
    return ActorManagementRead(
        id=actor.id,
        name=actor.name,
        is_active=actor.is_active,
        in_use=in_use,
        aliases=[ActorAliasRead.model_validate(alias) for alias in actor.aliases],
    )


def update_actor(db: Session, actor: Actor, *, name=_UNSET, is_active=_UNSET) -> Actor:
    if name is not _UNSET:
        clean_name = (name or "").strip()
        if not clean_name:
            raise ActorNameConflictError("Actor name is required.")
        target = _normalize(clean_name)
        others = [
            other for other in db.execute(select(Actor)).scalars() if other.id != actor.id
        ]
        if any(_normalize(other.name) == target for other in others):
            raise ActorNameConflictError("An actor with this name already exists.")
        actor.name = clean_name
    if is_active is not _UNSET and is_active is not None:
        actor.is_active = is_active
    db.commit()
    db.refresh(actor)
    return actor


def delete_actor(db: Session, actor: Actor) -> None:
    referenced = db.execute(
        select(EventActor.event_id).where(EventActor.actor_id == actor.id).limit(1)
    ).first()
    if referenced is not None:
        raise ActorInUseError("This actor is used by an event and cannot be deleted.")
    db.delete(actor)
    db.commit()


def add_actor_alias(db: Session, actor: Actor, alias: str) -> ActorAlias:
    clean_alias = alias.strip()
    if not clean_alias:
        raise ActorAliasConflictError("Alias is required.")
    target = _normalize(clean_alias)
    all_actors = list(db.execute(select(Actor)).scalars())
    for other in all_actors:
        if _normalize(other.name) == target:
            raise ActorAliasConflictError("Alias cannot match an existing actor's name.")
        for existing_alias in other.aliases:
            if _normalize(existing_alias.alias) == target:
                raise ActorAliasConflictError("This alias is already in use.")
    alias_row = ActorAlias(actor=actor, alias=clean_alias)
    db.add(alias_row)
    db.commit()
    db.refresh(alias_row)
    return alias_row


def remove_actor_alias(db: Session, alias_row: ActorAlias) -> None:
    db.delete(alias_row)
    db.commit()
