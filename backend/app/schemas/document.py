from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

ProcessingStatus = Literal[
    "draft", "queued", "processing", "ready_for_review", "completed", "failed"
]


class DocumentCreate(BaseModel):
    title: str
    content: str
    publication_date: str
    source_url: str | None = None

    @field_validator("publication_date")
    @classmethod
    def reject_blank_publication_date(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Publication date cannot be blank.")
        return value


class DocumentUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    publication_date: str | None = None
    source_url: str | None = None

    @field_validator("publication_date")
    @classmethod
    def reject_blank_publication_date(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("Publication date cannot be blank.")
        return value

    @model_validator(mode="after")
    def reject_null_publication_date_when_supplied(self) -> "DocumentUpdate":
        if "publication_date" in self.model_fields_set and self.publication_date is None:
            raise ValueError("Publication date cannot be null.")
        return self


class AttachmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    original_name: str
    media_type: str
    size_bytes: int
    created_at: datetime


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    content: str
    publication_date: str
    source_url: str | None
    input_date: datetime
    processing_status: ProcessingStatus
    processing_error: str | None
    created_at: datetime
    updated_at: datetime
    attachments: list[AttachmentRead] = []
