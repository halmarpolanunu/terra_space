from collections.abc import Iterator

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, sessionmaker

from app.schemas.event import EventRead
from app.services.events import get_event, list_events, list_events_for_document, to_event_read


def create_events_router(session_factory: sessionmaker) -> APIRouter:
    router = APIRouter()

    def get_db() -> Iterator[Session]:
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    @router.get("/api/documents/{document_id}/events", response_model=list[EventRead])
    def list_for_document(document_id: str, db: Session = Depends(get_db)) -> list[EventRead]:
        return [to_event_read(event) for event in list_events_for_document(db, document_id)]

    @router.get("/api/events", response_model=list[EventRead])
    def list_all(
        review_status: str | None = None, db: Session = Depends(get_db)
    ) -> list[EventRead]:
        return [to_event_read(event) for event in list_events(db, review_status)]

    @router.get("/api/events/{event_id}", response_model=EventRead)
    def get_one(event_id: str, db: Session = Depends(get_db)) -> EventRead:
        event = get_event(db, event_id)
        if event is None:
            raise HTTPException(status_code=404, detail="Event not found.")
        return to_event_read(event)

    return router
