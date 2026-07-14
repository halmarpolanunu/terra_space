import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Document, Source


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().casefold()


def quote_found(quote: str, document_content: str) -> bool:
    normalized_quote = normalize_text(quote)
    if not normalized_quote:
        return False
    return normalized_quote in normalize_text(document_content)


def find_by_exact_name(candidates: list, name: str):
    target = name.strip().casefold()
    for candidate in candidates:
        if candidate.name.strip().casefold() == target:
            return candidate
    return None


def get_or_create_document_source(db: Session, document: Document) -> Source:
    existing = db.execute(
        select(Source).where(Source.document_id == document.id)
    ).scalar_one_or_none()
    if existing is not None:
        return existing
    source = Source(document=document, reference_label=document.title)
    db.add(source)
    db.flush()
    return source
