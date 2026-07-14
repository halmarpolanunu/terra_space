from collections.abc import Iterator

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.db.models import Actor, Document, Event, EventSource, EventType, Source
from app.services.extraction import persist_extraction
from app.services.lm_studio import ExtractionError, LmStudioClient

ACTIVE_PROCESSING_STATUSES = {"queued", "processing"}


class ProcessRequest(BaseModel):
    document_ids: list[str]
    confirm_reprocess: bool = False


def _has_approved_events(db: Session, document_id: str) -> bool:
    match = db.execute(
        select(Event.id)
        .join(EventSource, EventSource.event_id == Event.id)
        .join(Source, Source.id == EventSource.source_id)
        .where(Source.document_id == document_id, Event.review_status == "approved")
        .limit(1)
    ).first()
    return match is not None


def _process_document(
    session_factory: sessionmaker, lm_studio_client: LmStudioClient, document_id: str
) -> None:
    db = session_factory()
    try:
        document = db.get(Document, document_id)
        if document is None:
            return
        document.processing_status = "processing"
        db.commit()

        try:
            active_types = [
                event_type.name
                for event_type in db.execute(
                    select(EventType).where(EventType.is_active.is_(True))
                ).scalars()
            ]
            active_actors = [
                actor.name
                for actor in db.execute(select(Actor).where(Actor.is_active.is_(True))).scalars()
            ]
            extraction_result = lm_studio_client.extract_events(
                document.content, active_types, active_actors
            )
            persist_extraction(db, document, extraction_result)
            document.processing_status = "ready_for_review"
            document.processing_error = None
            db.commit()
        except ExtractionError as error:
            db.rollback()
            document = db.get(Document, document_id)
            document.processing_status = "failed"
            document.processing_error = str(error)
            db.commit()
    finally:
        db.close()


def _process_batch(
    session_factory: sessionmaker, lm_studio_client: LmStudioClient, document_ids: list[str]
) -> None:
    for document_id in document_ids:
        _process_document(session_factory, lm_studio_client, document_id)


def create_processing_router(
    session_factory: sessionmaker, lm_studio_client: LmStudioClient
) -> APIRouter:
    router = APIRouter()

    def get_db() -> Iterator[Session]:
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    @router.post("/api/documents/process", status_code=202)
    def process(
        payload: ProcessRequest,
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db),
    ) -> dict:
        documents = []
        for document_id in payload.document_ids:
            document = db.get(Document, document_id)
            if document is None:
                raise HTTPException(status_code=404, detail=f"Document {document_id} not found.")
            if document.processing_status in ACTIVE_PROCESSING_STATUSES:
                raise HTTPException(
                    status_code=409,
                    detail=f"Document {document_id} is already queued or processing.",
                )
            documents.append(document)

        if not payload.confirm_reprocess:
            needs_confirmation = [
                document.id
                for document in documents
                if document.processing_status == "completed"
                and _has_approved_events(db, document.id)
            ]
            if needs_confirmation:
                return {"status": "confirmation_required", "document_ids": needs_confirmation}

        for document in documents:
            document.processing_status = "queued"
            document.processing_error = None
        db.commit()

        background_tasks.add_task(
            _process_batch, session_factory, lm_studio_client, [document.id for document in documents]
        )

        return {"status": "queued", "document_ids": [document.id for document in documents]}

    @router.post("/api/documents/{document_id}/retry", status_code=202)
    def retry(
        document_id: str,
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db),
    ) -> dict:
        document = db.get(Document, document_id)
        if document is None:
            raise HTTPException(status_code=404, detail="Document not found.")
        if document.processing_status != "failed":
            raise HTTPException(status_code=409, detail="Only a failed document can be retried.")

        document.processing_status = "queued"
        document.processing_error = None
        db.commit()

        background_tasks.add_task(
            _process_batch, session_factory, lm_studio_client, [document.id]
        )

        return {"status": "queued", "document_ids": [document.id]}

    return router
