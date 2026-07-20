"""Per-stage extraction log: records what every staged-pipeline call was asked, what came
back, and what was dropped and why, so location-style silent-failure investigations become
diagnosable instead of relying on live reproduction."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import ExtractionLogEntry
from app.schemas.extraction_log import ExtractionLogOutcome, ExtractionLogStage


def log_extraction(
    db: Session,
    *,
    document_id: str,
    stage: ExtractionLogStage,
    outcome: ExtractionLogOutcome,
    detail: str,
    candidate_index: int | None = None,
) -> ExtractionLogEntry:
    entry = ExtractionLogEntry(
        document_id=document_id,
        candidate_index=candidate_index,
        stage=stage,
        outcome=outcome,
        detail=detail,
    )
    db.add(entry)
    return entry


def list_extraction_log(db: Session, document_id: str) -> list[ExtractionLogEntry]:
    return list(
        db.execute(
            select(ExtractionLogEntry)
            .where(ExtractionLogEntry.document_id == document_id)
            .order_by(ExtractionLogEntry.created_at.desc(), ExtractionLogEntry.id.desc())
        ).scalars()
    )
