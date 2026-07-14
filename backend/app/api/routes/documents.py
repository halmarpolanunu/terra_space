from collections.abc import Iterator

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, sessionmaker

from app.schemas.document import DocumentCreate, DocumentRead, DocumentUpdate
from app.services.documents import (
    DocumentEditNotAllowedError,
    create_document,
    delete_document,
    get_document,
    list_documents,
    update_document,
)


def create_documents_router(session_factory: sessionmaker) -> APIRouter:
    router = APIRouter()

    def get_db() -> Iterator[Session]:
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    @router.post("/api/documents", response_model=DocumentRead, status_code=201)
    def create(payload: DocumentCreate, db: Session = Depends(get_db)) -> DocumentRead:
        return create_document(db, payload)

    @router.get("/api/documents", response_model=list[DocumentRead])
    def list_all(
        processing_status: str | None = None, db: Session = Depends(get_db)
    ) -> list[DocumentRead]:
        return list_documents(db, processing_status)

    @router.get("/api/documents/{document_id}", response_model=DocumentRead)
    def get_one(document_id: str, db: Session = Depends(get_db)) -> DocumentRead:
        document = get_document(db, document_id)
        if document is None:
            raise HTTPException(status_code=404, detail="Document not found.")
        return document

    @router.patch("/api/documents/{document_id}", response_model=DocumentRead)
    def update(
        document_id: str, payload: DocumentUpdate, db: Session = Depends(get_db)
    ) -> DocumentRead:
        document = get_document(db, document_id)
        if document is None:
            raise HTTPException(status_code=404, detail="Document not found.")
        try:
            return update_document(db, document, payload)
        except DocumentEditNotAllowedError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error

    @router.delete("/api/documents/{document_id}", status_code=204)
    def delete(document_id: str, db: Session = Depends(get_db)) -> None:
        document = get_document(db, document_id)
        if document is None:
            raise HTTPException(status_code=404, detail="Document not found.")
        delete_document(db, document)

    return router
