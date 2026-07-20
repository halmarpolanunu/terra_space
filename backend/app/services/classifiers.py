"""Stage 2 of the staged event detection pipeline: four narrow per-candidate classifiers.

Each wraps its LmStudioClient call so a failure is logged and returned as ``None`` rather
than raised — letting the caller (the Task 5 orchestration) save the event with that one
attribute blank instead of losing the whole candidate. A success is logged too, so the
extraction log always shows what every classifier call was asked and what it returned."""

from collections.abc import Callable
from typing import TypeVar

from sqlalchemy.orm import Session

from app.db.models import Document
from app.schemas.extraction_log import ExtractionLogStage
from app.schemas.staged_extraction import (
    ClassifiedActors,
    ClassifiedDate,
    ClassifiedEventType,
    ClassifiedLocations,
    SignalCandidate,
)
from app.services.extraction_log import log_extraction
from app.services.lm_studio import (
    DocumentExtractionContext,
    ExtractionError,
    KnownEventType,
    LmStudioClient,
)

ClassifierResult = TypeVar("ClassifierResult")


def _document_context(document: Document) -> DocumentExtractionContext:
    return DocumentExtractionContext(
        title=document.title,
        publication_date=document.publication_date,
        content=document.content,
    )


def _run_classifier(
    db: Session,
    *,
    document_id: str,
    candidate_index: int,
    stage: ExtractionLogStage,
    call: Callable[[], ClassifierResult],
    describe_success: Callable[[ClassifierResult], str],
) -> ClassifierResult | None:
    try:
        result = call()
    except ExtractionError as error:
        log_extraction(
            db,
            document_id=document_id,
            candidate_index=candidate_index,
            stage=stage,
            outcome="failed",
            detail=str(error),
        )
        return None
    log_extraction(
        db,
        document_id=document_id,
        candidate_index=candidate_index,
        stage=stage,
        outcome="ok",
        detail=describe_success(result),
    )
    return result


def run_event_type_classifier(
    db: Session,
    document: Document,
    candidate: SignalCandidate,
    candidate_index: int,
    lm_studio_client: LmStudioClient,
    known_types: list[KnownEventType],
) -> ClassifiedEventType | None:
    return _run_classifier(
        db,
        document_id=document.id,
        candidate_index=candidate_index,
        stage="event_type",
        call=lambda: lm_studio_client.classify_event_type(
            _document_context(document), candidate, known_types
        ),
        describe_success=lambda result: f"Classified event type: {result.existing or 'none'}.",
    )


def run_date_classifier(
    db: Session,
    document: Document,
    candidate: SignalCandidate,
    candidate_index: int,
    lm_studio_client: LmStudioClient,
) -> ClassifiedDate | None:
    return _run_classifier(
        db,
        document_id=document.id,
        candidate_index=candidate_index,
        stage="event_date",
        call=lambda: lm_studio_client.classify_date(_document_context(document), candidate),
        describe_success=lambda result: (
            f"Classified event date: {result.event_date or 'none'}"
            f" ({result.event_date_precision or 'n/a'})."
        ),
    )


def run_locations_classifier(
    db: Session,
    document: Document,
    candidate: SignalCandidate,
    candidate_index: int,
    lm_studio_client: LmStudioClient,
) -> ClassifiedLocations | None:
    return _run_classifier(
        db,
        document_id=document.id,
        candidate_index=candidate_index,
        stage="locations",
        call=lambda: lm_studio_client.classify_locations(_document_context(document), candidate),
        describe_success=lambda result: f"Classified {len(result.locations)} location(s).",
    )


def run_actors_classifier(
    db: Session,
    document: Document,
    candidate: SignalCandidate,
    candidate_index: int,
    lm_studio_client: LmStudioClient,
    known_actors: list[str],
) -> ClassifiedActors | None:
    return _run_classifier(
        db,
        document_id=document.id,
        candidate_index=candidate_index,
        stage="actors",
        call=lambda: lm_studio_client.classify_actors(
            _document_context(document), candidate, known_actors
        ),
        describe_success=lambda result: (
            f"Classified {len(result.source_actors)} source actor(s), "
            f"{len(result.recipient_actors)} recipient actor(s)."
        ),
    )
