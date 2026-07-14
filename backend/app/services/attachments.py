import hashlib
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.db.models import Attachment, Document
from app.services.storage import StoragePaths

ALLOWED_MEDIA_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
}

MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024


class InvalidAttachmentError(Exception):
    """Raised when an uploaded file is not an accepted local image attachment."""


def save_attachment(paths: StoragePaths, document: Document, upload: UploadFile) -> Attachment:
    media_type = upload.content_type or ""
    extension = ALLOWED_MEDIA_TYPES.get(media_type)
    if extension is None:
        raise InvalidAttachmentError(f"Unsupported attachment type: {media_type or 'unknown'}.")

    content = upload.file.read()
    if len(content) > MAX_ATTACHMENT_BYTES:
        raise InvalidAttachmentError(
            f"Attachment exceeds the {MAX_ATTACHMENT_BYTES // (1024 * 1024)} MB limit."
        )

    relative_path = f"attachments/{uuid4()}{extension}"
    file_path = paths.root / relative_path
    file_path.write_bytes(content)

    return Attachment(
        document=document,
        relative_path=relative_path,
        original_name=upload.filename or "attachment",
        media_type=media_type,
        size_bytes=len(content),
        checksum=hashlib.sha256(content).hexdigest(),
    )


def attachment_file_path(paths: StoragePaths, attachment: Attachment) -> Path:
    return paths.root / attachment.relative_path


def delete_attachment_file(paths: StoragePaths, attachment: Attachment) -> None:
    attachment_file_path(paths, attachment).unlink(missing_ok=True)
