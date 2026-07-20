from collections.abc import Iterator

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, sessionmaker

from app.db.models import Actor, ActorAlias
from app.schemas.actor import ActorAliasCreate, ActorAliasRead, ActorManagementRead, ActorUpdate
from app.services.actors import (
    ActorAliasConflictError,
    ActorInUseError,
    ActorNameConflictError,
    add_actor_alias,
    delete_actor,
    list_actors_for_management,
    referenced_actor_ids,
    remove_actor_alias,
    to_actor_management_read,
    update_actor,
)


def create_actors_router(session_factory: sessionmaker) -> APIRouter:
    router = APIRouter()

    def get_db() -> Iterator[Session]:
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    @router.get("/api/actor-management", response_model=list[ActorManagementRead])
    def list_all(db: Session = Depends(get_db)) -> list[ActorManagementRead]:
        referenced = referenced_actor_ids(db)
        return [
            to_actor_management_read(actor, in_use=actor.id in referenced)
            for actor in list_actors_for_management(db)
        ]

    @router.patch("/api/actor-management/{actor_id}", response_model=ActorManagementRead)
    def update(
        actor_id: str, payload: ActorUpdate, db: Session = Depends(get_db)
    ) -> ActorManagementRead:
        actor = db.get(Actor, actor_id)
        if actor is None:
            raise HTTPException(status_code=404, detail="Actor not found.")
        kwargs: dict[str, object] = {}
        if "name" in payload.model_fields_set:
            kwargs["name"] = payload.name
        if "is_active" in payload.model_fields_set:
            kwargs["is_active"] = payload.is_active
        try:
            actor = update_actor(db, actor, **kwargs)
        except ActorNameConflictError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        referenced = referenced_actor_ids(db)
        return to_actor_management_read(actor, in_use=actor.id in referenced)

    @router.delete("/api/actor-management/{actor_id}", status_code=204)
    def delete(actor_id: str, db: Session = Depends(get_db)) -> None:
        actor = db.get(Actor, actor_id)
        if actor is None:
            raise HTTPException(status_code=404, detail="Actor not found.")
        try:
            delete_actor(db, actor)
        except ActorInUseError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error

    @router.post(
        "/api/actor-management/{actor_id}/aliases",
        response_model=ActorAliasRead,
        status_code=201,
    )
    def add_alias(
        actor_id: str, payload: ActorAliasCreate, db: Session = Depends(get_db)
    ) -> ActorAliasRead:
        actor = db.get(Actor, actor_id)
        if actor is None:
            raise HTTPException(status_code=404, detail="Actor not found.")
        try:
            alias = add_actor_alias(db, actor, payload.alias)
        except ActorAliasConflictError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        return ActorAliasRead.model_validate(alias)

    @router.delete("/api/actor-management/{actor_id}/aliases/{alias_id}", status_code=204)
    def delete_alias(actor_id: str, alias_id: str, db: Session = Depends(get_db)) -> None:
        alias = db.get(ActorAlias, alias_id)
        if alias is None or alias.actor_id != actor_id:
            raise HTTPException(status_code=404, detail="Alias not found.")
        remove_actor_alias(db, alias)

    return router
