"""Stage 1 of the staged event detection pipeline: call the Signal Parser, then drop any
candidate whose evidence quote is not verbatim in the source document (existing
"never invent" grounding rule), logging every drop for later diagnosis."""

from sqlalchemy.orm import Session

from app.db.models import Document
from app.schemas.staged_extraction import SignalCandidate
from app.services.extraction_log import log_extraction
from app.services.lm_studio import DocumentExtractionContext, LmStudioClient
from app.services.matching import quote_found


def parse_and_validate_signals(
    db: Session, document: Document, lm_studio_client: LmStudioClient
) -> list[SignalCandidate]:
    result = lm_studio_client.parse_signals(
        DocumentExtractionContext(
            title=document.title,
            publication_date=document.publication_date,
            content=document.content,
        )
    )

    kept: list[SignalCandidate] = []
    for candidate in result.candidates:
        if quote_found(candidate.evidence_quote, document.content):
            kept.append(candidate)
        else:
            log_extraction(
                db,
                document_id=document.id,
                stage="signal_parser",
                outcome="dropped",
                detail=(
                    f"Dropped candidate {candidate.working_title!r}: evidence quote not "
                    "found in the source document."
                ),
            )

    return kept
