from pathlib import Path

import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.models import Actor, Document, Event, EventType
from app.db.session import configure_sqlite_connection
from app.schemas.extraction import (
    ExtractedActor,
    ExtractedEvent,
    ExtractedEventType,
    ExtractedLocation,
    ExtractionResult,
)
from app.services.extraction import persist_extraction


def _session(tmp_path: Path) -> Session:
    engine = create_engine(f"sqlite:///{tmp_path / 'terra-space.db'}")
    configure_sqlite_connection(engine)
    Base.metadata.create_all(engine)
    return Session(engine)


def _document(**overrides: object) -> Document:
    defaults: dict = {
        "title": "Field report",
        "content": "A large protest occurred at the capitol on July 10th.",
        "document_date": "2026-07-10",
        "processing_status": "processing",
    }
    defaults.update(overrides)
    return Document(**defaults)


def _event(**overrides: object) -> ExtractedEvent:
    defaults: dict = {
        "title": "Protest at the capitol",
        "summary": "A large protest occurred.",
        "event_type": ExtractedEventType(existing="Protest"),
        "start_date": "2026-07-10",
        "start_date_precision": "exact",
        "end_date": None,
        "end_date_precision": None,
        "epistemic_status": "confirmed",
        "locations": [],
        "actors": [],
        "evidence_quote": "A large protest occurred at the capitol",
    }
    defaults.update(overrides)
    return ExtractedEvent(**defaults)


def test_extracted_event_type_does_not_accept_suggestions() -> None:
    with pytest.raises(ValidationError):
        ExtractedEventType.model_validate({"suggested": "Airstrike"})


def test_event_with_evidence_quote_not_found_is_dropped_but_others_are_saved(
    tmp_path: Path,
) -> None:
    session = _session(tmp_path)
    document = _document()
    session.add(document)
    session.commit()

    extraction = ExtractionResult(
        events=[
            _event(title="Fabricated event", evidence_quote="This sentence is not in the document."),
            _event(title="Real event"),
        ]
    )

    result = persist_extraction(session, document, extraction)

    assert len(result.saved_events) == 1
    assert result.saved_events[0].title == "Real event"
    assert len(result.dropped_events) == 1
    assert result.dropped_events[0].title == "Fabricated event"
    assert session.execute(select(Event)).scalars().all() == result.saved_events


def test_event_missing_title_or_summary_is_dropped(tmp_path: Path) -> None:
    session = _session(tmp_path)
    document = _document()
    session.add(document)
    session.commit()

    extraction = ExtractionResult(
        events=[
            _event(title=""),
            _event(summary="   "),
            _event(title="Kept event"),
        ]
    )

    result = persist_extraction(session, document, extraction)

    assert [event.title for event in result.saved_events] == ["Kept event"]
    assert len(result.dropped_events) == 2


def test_every_saved_event_is_a_draft(tmp_path: Path) -> None:
    session = _session(tmp_path)
    document = _document()
    session.add(document)
    session.commit()

    result = persist_extraction(session, document, ExtractionResult(events=[_event()]))

    assert result.saved_events[0].review_status == "draft"


def test_unknown_or_inactive_event_type_is_saved_blank_without_creating_a_type(
    tmp_path: Path,
) -> None:
    session = _session(tmp_path)
    document = _document()
    session.add(document)
    session.commit()

    inactive_type = EventType(name="Inactive type", is_active=False)
    session.add(inactive_type)
    session.commit()
    extraction = ExtractionResult(events=[
        _event(event_type=ExtractedEventType(existing="Nonexistent Type")),
        _event(title="Inactive type event", event_type=ExtractedEventType(existing="Inactive type")),
    ])

    result = persist_extraction(session, document, extraction)

    assert [event.event_type for event in result.saved_events] == [None, None]
    assert session.execute(select(EventType)).scalars().all() == [inactive_type]


def test_existing_event_type_reference_matches_case_insensitively_and_trims_whitespace(
    tmp_path: Path,
) -> None:
    session = _session(tmp_path)
    document = _document()
    confirmed_type = EventType(name="Protest", is_active=True)
    session.add_all([document, confirmed_type])
    session.commit()

    extraction = ExtractionResult(
        events=[_event(event_type=ExtractedEventType(existing="  protest  "))]
    )

    result = persist_extraction(session, document, extraction)

    assert result.saved_events[0].event_type_id == confirmed_type.id
    assert session.execute(select(EventType)).scalars().all() == [confirmed_type]


def test_new_actor_is_created_inactive_and_existing_actor_is_reused(tmp_path: Path) -> None:
    session = _session(tmp_path)
    document = _document()
    known_actor = Actor(name="Ministry of Health", is_active=True)
    session.add_all([document, known_actor])
    session.commit()

    extraction = ExtractionResult(
        events=[
            _event(
                actors=[
                    ExtractedActor(name="Ministry of Health", role="source", existing=True),
                    ExtractedActor(name="Unknown Group", role="target", existing=False),
                ]
            )
        ]
    )

    result = persist_extraction(session, document, extraction)

    actors_by_name = {
        link.actor.name: link.actor for link in result.saved_events[0].event_actors
    }
    assert actors_by_name["Ministry of Health"].id == known_actor.id
    assert actors_by_name["Unknown Group"].is_active is False
    assert session.execute(select(Actor)).scalars().all().__len__() == 2


def test_location_with_all_fields_null_is_not_attached(tmp_path: Path) -> None:
    session = _session(tmp_path)
    document = _document()
    session.add(document)
    session.commit()

    extraction = ExtractionResult(
        events=[_event(locations=[ExtractedLocation(country=None, admin1=None, city_regency=None)])]
    )

    result = persist_extraction(session, document, extraction)

    assert result.saved_events[0].locations == []


def test_location_with_a_field_present_is_attached(tmp_path: Path) -> None:
    session = _session(tmp_path)
    document = _document(content="A large protest occurred at the capitol in Jakarta on July 10th.")
    session.add(document)
    session.commit()

    extraction = ExtractionResult(
        events=[
            _event(
                evidence_quote="A large protest occurred at the capitol in Jakarta",
                locations=[ExtractedLocation(country="ID", admin1=None, city_regency="Jakarta")],
            )
        ]
    )

    result = persist_extraction(session, document, extraction)

    assert len(result.saved_events[0].locations) == 1
    assert result.saved_events[0].locations[0].city_regency == "Jakarta"


def test_location_with_ungrounded_admin1_and_city_regency_is_dropped(tmp_path: Path) -> None:
    session = _session(tmp_path)
    document = _document()
    session.add(document)
    session.commit()

    extraction = ExtractionResult(
        events=[
            _event(
                locations=[
                    ExtractedLocation(country="ID", admin1="Jakarta", city_regency="Jakarta")
                ]
            )
        ]
    )

    result = persist_extraction(session, document, extraction)

    assert result.saved_events[0].locations == []
    assert len(result.dropped_locations) == 1
    assert result.dropped_locations[0].event_title == "Protest at the capitol"


def test_location_with_only_country_is_trusted_without_grounding(tmp_path: Path) -> None:
    session = _session(tmp_path)
    document = _document()
    session.add(document)
    session.commit()

    extraction = ExtractionResult(
        events=[_event(locations=[ExtractedLocation(country="ID", admin1=None, city_regency=None)])]
    )

    result = persist_extraction(session, document, extraction)

    assert len(result.saved_events[0].locations) == 1
    assert result.saved_events[0].locations[0].country == "ID"
    assert result.dropped_locations == []


def test_location_is_kept_when_only_one_of_two_named_fields_is_grounded(tmp_path: Path) -> None:
    session = _session(tmp_path)
    document = _document(content="A large protest occurred at the capitol in Jakarta on July 10th.")
    session.add(document)
    session.commit()

    extraction = ExtractionResult(
        events=[
            _event(
                evidence_quote="A large protest occurred at the capitol in Jakarta",
                locations=[
                    ExtractedLocation(country="ID", admin1="Unmentioned Province", city_regency="Jakarta")
                ],
            )
        ]
    )

    result = persist_extraction(session, document, extraction)

    assert len(result.saved_events[0].locations) == 1
    assert result.saved_events[0].locations[0].admin1 == "Unmentioned Province"
    assert result.dropped_locations == []


def test_persisted_event_links_back_to_document_source_with_evidence_quote(
    tmp_path: Path,
) -> None:
    session = _session(tmp_path)
    document = _document()
    session.add(document)
    session.commit()

    result = persist_extraction(session, document, ExtractionResult(events=[_event()]))

    event_source = result.saved_events[0].event_sources[0]
    assert event_source.source.document_id == document.id
    assert event_source.evidence_quote == "A large protest occurred at the capitol"
