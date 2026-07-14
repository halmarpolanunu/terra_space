from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

ProcessingStatus = Literal[
    "draft", "queued", "processing", "ready_for_review", "completed", "failed"
]


class DocumentCreate(BaseModel):
    title: str
    content: str
    document_date: str
    publication_date: str | None = None
    source_url: str | None = None


class DocumentUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    document_date: str | None = None
    publication_date: str | None = None
    source_url: str | None = None


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    content: str
    document_date: str
    publication_date: str | None
    source_url: str | None
    input_date: datetime
    processing_status: ProcessingStatus
    processing_error: str | None
    created_at: datetime
    updated_at: datetime
