from collections.abc import Iterator
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, sessionmaker

from app.db.models import DuplicateFlag, EventType
from app.schemas.duplicate import DuplicateResolveRequest
from app.schemas.event import (
    ActorRead,
    ApproveAllResponse,
    ApproveAllSkipped,
    EventCreate,
    EventRead,
    EventTypeCreate,
    EventTypeRead,
    EventTypeUpdate,
    EventUpdate,
    DashboardSummaryRead,
)
from app.services.documents import get_document
from app.services.duplicates import DuplicateFlagAlreadyResolvedError, resolve_duplicate_flag
from app.services.events import (
    EventEditNotAllowedError,
    EventTypeInUseError,
    EventTypeNameConflictError,
    EvidenceQuoteNotFoundError,
    PendingDuplicateFlagError,
    approve_all_for_document,
    approve_event,
    create_event_type,
    create_manual_event,
    delete_event_type,
    get_event,
    list_actors,
    list_event_types,
    list_events,
    list_filtered_events,
    list_events_for_document,
    reject_event,
    dashboard_summary,
    to_event_read,
    update_event,
    update_event_type,
)


def create_events_router(session_factory: sessionmaker) -> APIRouter:
    router = APIRouter()

    def get_db() -> Iterator[Session]:
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    @router.get("/api/event-types", response_model=list[EventTypeRead])
    def list_event_types_route(db: Session = Depends(get_db)) -> list[EventTypeRead]:
        return [
            EventTypeRead.model_validate(event_type) for event_type in list_event_types(db)
        ]

    @router.post("/api/event-types", response_model=EventTypeRead, status_code=201)
    def create_event_type_route(
        payload: EventTypeCreate, db: Session = Depends(get_db)
    ) -> EventTypeRead:
        try:
            event_type = create_event_type(db, payload.name)
        except EventTypeNameConflictError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        return EventTypeRead.model_validate(event_type)

    @router.patch("/api/event-types/{type_id}", response_model=EventTypeRead)
    def update_event_type_route(
        type_id: str, payload: EventTypeUpdate, db: Session = Depends(get_db)
    ) -> EventTypeRead:
        event_type = db.get(EventType, type_id)
        if event_type is None:
            raise HTTPException(status_code=404, detail="Event type not found.")
        kwargs = {}
        if "name" in payload.model_fields_set:
            kwargs["name"] = payload.name
        if "is_active" in payload.model_fields_set:
            kwargs["is_active"] = payload.is_active
        try:
            event_type = update_event_type(db, event_type, **kwargs)
        except EventTypeNameConflictError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        return EventTypeRead.model_validate(event_type)

    @router.delete("/api/event-types/{type_id}", status_code=204)
    def delete_event_type_route(type_id: str, db: Session = Depends(get_db)) -> None:
        event_type = db.get(EventType, type_id)
        if event_type is None:
            raise HTTPException(status_code=404, detail="Event type not found.")
        try:
            delete_event_type(db, event_type)
        except EventTypeInUseError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error

    @router.get("/api/actors", response_model=list[ActorRead])
    def list_actors_route(db: Session = Depends(get_db)) -> list[ActorRead]:
        return [ActorRead.model_validate(actor) for actor in list_actors(db)]

    @router.get("/api/documents/{document_id}/events", response_model=list[EventRead])
    def list_for_document(document_id: str, db: Session = Depends(get_db)) -> list[EventRead]:
        return [to_event_read(event) for event in list_events_for_document(db, document_id)]

    @router.get("/api/events", response_model=list[EventRead])
    def list_all(
        review_status: str | None = None,
        q: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        event_type_id: str | None = None,
        epistemic_status: str | None = None,
        actor_id: str | None = None,
        country: str | None = None,
        admin1: str | None = None,
        city_regency: str | None = None,
        document_id: str | None = None,
        sort: Literal["date_desc", "date_asc", "created_desc", "title_asc"] = "date_desc",
        db: Session = Depends(get_db),
    ) -> list[EventRead]:
        if date_from and date_to and date_from > date_to:
            raise HTTPException(status_code=422, detail="date_from must be on or before date_to.")
        return [
            to_event_read(event)
            for event in list_filtered_events(
                db,
                review_status=review_status,
                q=q,
                date_from=date_from,
                date_to=date_to,
                event_type_id=event_type_id,
                epistemic_status=epistemic_status,
                actor_id=actor_id,
                country=country,
                admin1=admin1,
                city_regency=city_regency,
                document_id=document_id,
                sort=sort,
            )
        ]

    @router.get("/api/events/dashboard-summary", response_model=DashboardSummaryRead)
    def dashboard_summary_route(
        q: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        event_type_id: str | None = None,
        epistemic_status: str | None = None,
        actor_id: str | None = None,
        country: str | None = None,
        admin1: str | None = None,
        city_regency: str | None = None,
        document_id: str | None = None,
        sort: Literal["date_desc", "date_asc", "created_desc", "title_asc"] = "date_desc",
        db: Session = Depends(get_db),
    ) -> DashboardSummaryRead:
        if date_from and date_to and date_from > date_to:
            raise HTTPException(status_code=422, detail="date_from must be on or before date_to.")
        events = list_filtered_events(
            db,
            review_status="approved",
            q=q,
            date_from=date_from,
            date_to=date_to,
            event_type_id=event_type_id,
            epistemic_status=epistemic_status,
            actor_id=actor_id,
            country=country,
            admin1=admin1,
            city_regency=city_regency,
            document_id=document_id,
            sort=sort,
        )
        return DashboardSummaryRead(**dashboard_summary(events))

    @router.get("/api/events/{event_id}", response_model=EventRead)
    def get_one(event_id: str, db: Session = Depends(get_db)) -> EventRead:
        event = get_event(db, event_id)
        if event is None:
            raise HTTPException(status_code=404, detail="Event not found.")
        return to_event_read(event)

    @router.post("/api/events", response_model=EventRead, status_code=201)
    def create_manual(payload: EventCreate, db: Session = Depends(get_db)) -> EventRead:
        document = get_document(db, payload.document_id)
        if document is None:
            raise HTTPException(status_code=404, detail="Document not found.")
        try:
            event = create_manual_event(db, document, payload)
        except EvidenceQuoteNotFoundError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        return to_event_read(event)

    @router.patch("/api/events/{event_id}", response_model=EventRead)
    def update(event_id: str, payload: EventUpdate, db: Session = Depends(get_db)) -> EventRead:
        event = get_event(db, event_id)
        if event is None:
            raise HTTPException(status_code=404, detail="Event not found.")
        try:
            event = update_event(db, event, payload)
        except EventEditNotAllowedError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        return to_event_read(event)

    @router.post("/api/events/{event_id}/approve", response_model=EventRead)
    def approve(event_id: str, db: Session = Depends(get_db)) -> EventRead:
        event = get_event(db, event_id)
        if event is None:
            raise HTTPException(status_code=404, detail="Event not found.")
        try:
            event = approve_event(db, event)
        except EventEditNotAllowedError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        except PendingDuplicateFlagError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        return to_event_read(event)

    @router.post("/api/events/{event_id}/reject", response_model=EventRead)
    def reject(event_id: str, db: Session = Depends(get_db)) -> EventRead:
        event = get_event(db, event_id)
        if event is None:
            raise HTTPException(status_code=404, detail="Event not found.")
        try:
            event = reject_event(db, event)
        except EventEditNotAllowedError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        return to_event_read(event)

    @router.post(
        "/api/events/{event_id}/duplicate-flags/{flag_id}/resolve", response_model=EventRead
    )
    def resolve(
        event_id: str,
        flag_id: str,
        payload: DuplicateResolveRequest,
        db: Session = Depends(get_db),
    ) -> EventRead:
        event = get_event(db, event_id)
        if event is None:
            raise HTTPException(status_code=404, detail="Event not found.")
        flag = db.get(DuplicateFlag, flag_id)
        if flag is None or flag.draft_event_id != event_id:
            raise HTTPException(status_code=404, detail="Duplicate flag not found.")
        try:
            event = resolve_duplicate_flag(db, event, flag, payload.resolution)
        except DuplicateFlagAlreadyResolvedError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        return to_event_read(event)

    @router.post(
        "/api/documents/{document_id}/events/approve-all", response_model=ApproveAllResponse
    )
    def approve_all(document_id: str, db: Session = Depends(get_db)) -> ApproveAllResponse:
        document = get_document(db, document_id)
        if document is None:
            raise HTTPException(status_code=404, detail="Document not found.")
        result = approve_all_for_document(db, document_id)
        return ApproveAllResponse(
            approved_event_ids=result.approved_event_ids,
            skipped=[
                ApproveAllSkipped(event_id=skip.event_id, reason=skip.reason)
                for skip in result.skipped
            ],
        )

    return router
