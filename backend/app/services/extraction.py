from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session, aliased

from app.db.models import (
    Actor,
    Document,
    Event,
    EventActor,
    EventSource,
    EventType,
    Location,
    TaxonomyNode,
)
from app.schemas.staged_extraction import ClassifiedLocation
from app.services.classifiers import (
    run_actors_classifier,
    run_date_classifier,
    run_event_type_classifier,
    run_locations_classifier,
)
from app.services.duplicates import detect_duplicates
from app.services.extraction_log import log_extraction
from app.services.lm_studio import KnownEventType, LmStudioClient
from app.services.locations import apply_coordinates
from app.services.matching import (
    find_actor_by_name_or_alias,
    find_by_exact_name,
    get_or_create_document_source,
    quote_found,
)
from app.services.signal_parser import parse_and_validate_signals


@dataclass
class PersistResult:
    saved_events: list[Event] = field(default_factory=list)


def _location_grounded(location_data: ClassifiedLocation, evidence_quote: str) -> bool:
    named_fields = [value for value in (location_data.admin1, location_data.city_regency) if value]
    if not named_fields:
        return True
    return any(quote_found(value, evidence_quote) for value in named_fields)


def active_event_taxonomy_leaves(db: Session) -> list[EventType]:
    """Active Event Types with a complete, active four-level taxonomy path -- the only
    types the AI may be offered or match against (mirrors the closed-taxonomy rule)."""
    leaf = aliased(TaxonomyNode)
    subcategory = aliased(TaxonomyNode)
    category = aliased(TaxonomyNode)
    domain = aliased(TaxonomyNode)
    return list(
        db.execute(
            select(EventType)
            .join(leaf, leaf.event_type_id == EventType.id)
            .join(subcategory, leaf.parent_id == subcategory.id)
            .join(category, subcategory.parent_id == category.id)
            .join(domain, category.parent_id == domain.id)
            .where(
                EventType.is_active.is_(True),
                leaf.level == "event_type",
                subcategory.level == "subcategory",
                category.level == "category",
                domain.level == "domain",
            )
        ).scalars()
    )


def run_staged_pipeline(
    db: Session,
    document: Document,
    lm_studio_client: LmStudioClient,
    known_types: list[KnownEventType],
    known_actors: list[str],
) -> PersistResult:
    """Run the staged event detection pipeline for one document and persist the result.

    Parses signal candidates, then runs the four per-candidate classifiers, then assembles
    and saves one draft Event per candidate. A Signal Parser failure raises (the caller
    fails the whole document, exactly like the old single-call flow); a classifier failure
    never raises here -- the event is still saved with that one attribute blank and
    ``extraction_incomplete`` set.
    """
    result = PersistResult()
    source = get_or_create_document_source(db, document)
    active_types = active_event_taxonomy_leaves(db)
    existing_actors = list(db.execute(select(Actor)).scalars())

    candidates = parse_and_validate_signals(db, document, lm_studio_client)

    for index, candidate in enumerate(candidates):
        if not candidate.working_title.strip() or not candidate.summary.strip():
            log_extraction(
                db,
                document_id=document.id,
                candidate_index=index,
                stage="signal_parser",
                outcome="dropped",
                detail="Candidate is missing a title or summary.",
            )
            continue

        classified_type = run_event_type_classifier(
            db, document, candidate, index, lm_studio_client, known_types
        )
        classified_date = run_date_classifier(db, document, candidate, index, lm_studio_client)
        classified_locations = run_locations_classifier(
            db, document, candidate, index, lm_studio_client
        )
        classified_actors = run_actors_classifier(
            db, document, candidate, index, lm_studio_client, known_actors
        )
        incomplete = any(
            value is None
            for value in (classified_type, classified_date, classified_locations, classified_actors)
        )

        event_type = None
        if classified_type is not None:
            event_type = find_by_exact_name(active_types, classified_type.existing or "")

        event = Event(
            title=candidate.working_title,
            summary=candidate.summary,
            event_date=classified_date.event_date if classified_date else None,
            event_date_precision=(
                classified_date.event_date_precision if classified_date else None
            ),
            epistemic_status=candidate.epistemic_status,
            review_status="draft",
            event_type=event_type,
            extraction_incomplete=incomplete,
        )
        db.add(event)
        event.event_sources.append(
            EventSource(source=source, evidence_quote=candidate.evidence_quote)
        )

        if classified_locations is not None:
            for location_data in classified_locations.locations:
                if not (
                    location_data.country or location_data.admin1 or location_data.city_regency
                ):
                    continue
                if not _location_grounded(location_data, candidate.evidence_quote):
                    log_extraction(
                        db,
                        document_id=document.id,
                        candidate_index=index,
                        stage="locations",
                        outcome="dropped",
                        detail="Location text not found in the candidate's evidence quote.",
                    )
                    continue
                location = Location(
                    country=location_data.country,
                    admin1=location_data.admin1,
                    city_regency=location_data.city_regency,
                )
                apply_coordinates(location)
                event.locations.append(location)

        if classified_actors is not None:
            for name in classified_actors.source_actors:
                actor = find_actor_by_name_or_alias(existing_actors, name)
                if actor is None:
                    actor = Actor(name=name, is_active=False)
                    db.add(actor)
                    existing_actors.append(actor)
                event.event_actors.append(EventActor(actor=actor, role="source"))
            for name in classified_actors.recipient_actors:
                actor = find_actor_by_name_or_alias(existing_actors, name)
                if actor is None:
                    actor = Actor(name=name, is_active=False)
                    db.add(actor)
                    existing_actors.append(actor)
                event.event_actors.append(EventActor(actor=actor, role="target"))

        detect_duplicates(db, event)
        result.saved_events.append(event)

    db.commit()
    return result
