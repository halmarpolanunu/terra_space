from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Document, Event, EventSource
from app.schemas.document import DocumentCreate, DocumentUpdate
from app.services.attachments import delete_attachment_file
from app.services.storage import StoragePaths

EDITABLE_PROCESSING_STATUSES = {"draft", "failed"}


class DocumentEditNotAllowedError(Exception):
    """Raised when editing a document that is queued or processing."""

    def __init__(self, processing_status: str) -> None:
        self.processing_status = processing_status
        super().__init__(f"Document cannot be edited while {processing_status}.")


class DocumentDeleteNotAllowedError(Exception):
    """Raised when deleting a source would leave a Phase 3 event without its evidence."""

    def __init__(self) -> None:
        super().__init__(
            "This source is referenced by an event and cannot be deleted. "
            "Reject or archive the event first if you no longer want it."
        )


def create_document(db: Session, payload: DocumentCreate) -> Document:
    document = Document(
        title=payload.title,
        content=payload.content,
        publication_date=payload.publication_date,
        source_url=payload.source_url or "",
        author="",
        source_domain="",
        collection_source="terra_space_ui",
        processing_status="draft",
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


def list_documents(db: Session, processing_status: str | None) -> list[Document]:
    query = select(Document)
    if processing_status is not None:
        query = query.where(Document.processing_status == processing_status)
    query = query.order_by(Document.created_at.desc())
    return list(db.execute(query).scalars())


def get_document(db: Session, document_id: str) -> Document | None:
    return db.get(Document, document_id)


def update_document(db: Session, document: Document, payload: DocumentUpdate) -> Document:
    if document.processing_status not in EDITABLE_PROCESSING_STATUSES:
        raise DocumentEditNotAllowedError(document.processing_status)

    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "source_url":
            value = value or ""
        setattr(document, field, value)

    db.commit()
    db.refresh(document)
    return document


def _referenced_by_any_event(db: Session, document_id: str) -> bool:
    """True if any Phase 3 event still traces its evidence back to this source.

    `terra_space_phase1_sources` is protected by the database itself (ON DELETE RESTRICT from
    both `phase3_events.phase1_source_id` and `phase3_event_sources.phase1_source_id`), so an
    unprotected delete attempt would fail with a raw IntegrityError -- this checks proactively so
    the API can give a clear, beginner-readable message instead.
    """

    direct = db.execute(
        select(Event.id).where(Event.phase1_source_id == document_id).limit(1)
    ).first()
    if direct is not None:
        return True
    via_evidence = db.execute(
        select(EventSource.event_id).where(EventSource.source_id == document_id).limit(1)
    ).first()
    return via_evidence is not None


def delete_document(db: Session, paths: StoragePaths, document: Document) -> None:
    if _referenced_by_any_event(db, document.id):
        raise DocumentDeleteNotAllowedError
    for attachment in document.attachments:
        delete_attachment_file(paths, attachment)
    db.delete(document)
    db.commit()
