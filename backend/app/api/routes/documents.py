from collections.abc import Iterator

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session, sessionmaker

from app.schemas.document import AttachmentRead, DocumentCreate, DocumentRead, DocumentUpdate
from app.schemas.extraction_log import ExtractionLogEntryRead
from app.services.attachments import (
    InvalidAttachmentError,
    attachment_file_path,
    delete_attachment_file,
    save_attachment,
)
from app.services.documents import (
    EDITABLE_PROCESSING_STATUSES,
    DocumentEditNotAllowedError,
    create_document,
    delete_document,
    get_document,
    list_documents,
    update_document,
)
from app.services.extraction_log import list_extraction_log
from app.services.storage import StoragePaths


def create_documents_router(session_factory: sessionmaker, paths: StoragePaths) -> APIRouter:
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
        delete_document(db, paths, document)

    def _editable_document_or_404_or_409(db: Session, document_id: str):
        document = get_document(db, document_id)
        if document is None:
            raise HTTPException(status_code=404, detail="Document not found.")
        if document.processing_status not in EDITABLE_PROCESSING_STATUSES:
            raise HTTPException(
                status_code=409,
                detail=f"Attachments cannot change while {document.processing_status}.",
            )
        return document

    @router.post(
        "/api/documents/{document_id}/attachments",
        response_model=AttachmentRead,
        status_code=201,
    )
    def upload_attachment(
        document_id: str, file: UploadFile, db: Session = Depends(get_db)
    ) -> AttachmentRead:
        document = _editable_document_or_404_or_409(db, document_id)
        try:
            attachment = save_attachment(paths, document, file)
        except InvalidAttachmentError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        db.add(attachment)
        db.commit()
        db.refresh(attachment)
        return AttachmentRead.model_validate(attachment)

    @router.get("/api/documents/{document_id}/attachments/{attachment_id}/file")
    def get_attachment_file(
        document_id: str, attachment_id: str, db: Session = Depends(get_db)
    ) -> Response:
        document = get_document(db, document_id)
        if document is None:
            raise HTTPException(status_code=404, detail="Document not found.")
        attachment = next((a for a in document.attachments if a.id == attachment_id), None)
        if attachment is None:
            raise HTTPException(status_code=404, detail="Attachment not found.")
        file_path = attachment_file_path(paths, attachment)
        if not file_path.is_file():
            raise HTTPException(status_code=404, detail="Attachment file not found.")
        return Response(content=file_path.read_bytes(), media_type=attachment.media_type)

    @router.delete("/api/documents/{document_id}/attachments/{attachment_id}", status_code=204)
    def delete_attachment(
        document_id: str, attachment_id: str, db: Session = Depends(get_db)
    ) -> None:
        document = _editable_document_or_404_or_409(db, document_id)
        attachment = next((a for a in document.attachments if a.id == attachment_id), None)
        if attachment is None:
            raise HTTPException(status_code=404, detail="Attachment not found.")
        delete_attachment_file(paths, attachment)
        db.delete(attachment)
        db.commit()

    @router.get(
        "/api/documents/{document_id}/extraction-log",
        response_model=list[ExtractionLogEntryRead],
    )
    def get_extraction_log(
        document_id: str, db: Session = Depends(get_db)
    ) -> list[ExtractionLogEntryRead]:
        document = get_document(db, document_id)
        if document is None:
            raise HTTPException(status_code=404, detail="Document not found.")
        return list_extraction_log(db, document_id)

    return router
