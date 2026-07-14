from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Document
from app.schemas.document import DocumentCreate, DocumentUpdate

EDITABLE_PROCESSING_STATUSES = {"draft", "failed"}


class DocumentEditNotAllowedError(Exception):
    """Raised when editing a document that is queued or processing."""

    def __init__(self, processing_status: str) -> None:
        self.processing_status = processing_status
        super().__init__(f"Document cannot be edited while {processing_status}.")


def create_document(db: Session, payload: DocumentCreate) -> Document:
    document = Document(
        title=payload.title,
        content=payload.content,
        document_date=payload.document_date,
        publication_date=payload.publication_date,
        source_url=payload.source_url,
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
        setattr(document, field, value)

    db.commit()
    db.refresh(document)
    return document


def delete_document(db: Session, document: Document) -> None:
    db.delete(document)
    db.commit()
