from datetime import UTC, datetime
from pathlib import Path

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.models import Actor, ActorAlias, Document, Event, EventType, TaxonomyNode
from app.db.session import configure_sqlite_connection
from app.services.extraction import run_staged_pipeline
from app.services.extraction_log import list_extraction_log
from app.services.lm_studio import LmStudioResponseError
from tests.staged_lm_studio_fake import FakeEventSpec, FakeLmStudioClient


def _session(tmp_path: Path) -> Session:
    engine = create_engine(f"sqlite:///{tmp_path / 'terra-space.db'}")
    configure_sqlite_connection(engine)
    Base.metadata.create_all(engine)
    return Session(engine)


def _document(session: Session, **overrides: object) -> Document:
    defaults: dict = {
        "title": "Field report",
        "content": "A large protest occurred at the capitol in Jakarta on July 10th. "
        "Talks are scheduled for Friday.",
        "publication_date": "2026-07-10",
        "input_date": datetime.now(UTC),
        "processing_status": "processing",
    }
    defaults.update(overrides)
    document = Document(**defaults)
    session.add(document)
    session.commit()
    return document


def _run(session, document, client, known_types=None, known_actors=None):
    return run_staged_pipeline(session, document, client, known_types or [], known_actors or [])


def test_multi_candidate_document_produces_multiple_complete_drafts(tmp_path: Path) -> None:
    session = _session(tmp_path)
    document = _document(session)
    client = FakeLmStudioClient(
        {
            document.content: [
                FakeEventSpec(
                    title="Protest at the capitol",
                    summary="A large protest occurred.",
                    evidence_quote="A large protest occurred at the capitol in Jakarta",
                ),
                FakeEventSpec(
                    title="Talks scheduled",
                    summary="Talks are scheduled for Friday.",
                    evidence_quote="Talks are scheduled for Friday.",
                ),
            ]
        }
    )

    result = _run(session, document, client)

    assert [event.title for event in result.saved_events] == [
        "Protest at the capitol",
        "Talks scheduled",
    ]
    assert all(event.review_status == "draft" for event in result.saved_events)
    assert all(event.extraction_incomplete is False for event in result.saved_events)
    assert session.execute(select(Event)).scalars().all() == result.saved_events


def test_one_failed_classifier_produces_an_incomplete_event_with_others_intact(
    tmp_path: Path,
) -> None:
    session = _session(tmp_path)
    document = _document(session)
    client = FakeLmStudioClient(
        {
            document.content: [
                FakeEventSpec(
                    title="Protest at the capitol",
                    summary="A large protest occurred.",
                    evidence_quote="A large protest occurred at the capitol in Jakarta",
                    event_date="2026-07-10",
                    event_date_precision="exact",
                    source_actors=["Students"],
                    fail_stages=frozenset({"locations"}),
                )
            ]
        }
    )

    result = _run(session, document, client)

    event = result.saved_events[0]
    assert event.extraction_incomplete is True
    assert event.event_date == "2026-07-10"
    assert event.event_date_precision == "exact"
    assert [link.actor.name for link in event.event_actors] == ["Students"]
    assert event.locations == []
    entries = list_extraction_log(session, document.id)
    assert any(entry.stage == "locations" and entry.outcome == "failed" for entry in entries)


def test_all_classifiers_failing_still_saves_a_titled_quoted_incomplete_draft(
    tmp_path: Path,
) -> None:
    session = _session(tmp_path)
    document = _document(session)
    client = FakeLmStudioClient(
        {
            document.content: [
                FakeEventSpec(
                    title="Protest at the capitol",
                    summary="A large protest occurred.",
                    evidence_quote="A large protest occurred at the capitol in Jakarta",
                    fail_stages=frozenset({"event_type", "event_date", "locations", "actors"}),
                )
            ]
        }
    )

    result = _run(session, document, client)

    event = result.saved_events[0]
    assert event.title == "Protest at the capitol"
    assert event.event_sources[0].evidence_quote == (
        "A large protest occurred at the capitol in Jakarta"
    )
    assert event.extraction_incomplete is True
    assert event.event_type is None
    assert event.event_date is None
    assert event.locations == []
    assert event.event_actors == []


def test_candidate_with_blank_title_or_summary_is_dropped_and_logged(tmp_path: Path) -> None:
    session = _session(tmp_path)
    document = _document(session)
    client = FakeLmStudioClient(
        {
            document.content: [
                FakeEventSpec(
                    title="",
                    summary="A large protest occurred.",
                    evidence_quote="A large protest occurred at the capitol in Jakarta",
                ),
                FakeEventSpec(
                    title="Talks scheduled",
                    summary="   ",
                    evidence_quote="Talks are scheduled for Friday.",
                ),
                FakeEventSpec(
                    title="Kept event",
                    summary="A large protest occurred.",
                    evidence_quote="A large protest occurred at the capitol in Jakarta",
                ),
            ]
        }
    )

    result = _run(session, document, client)

    assert [event.title for event in result.saved_events] == ["Kept event"]
    entries = list_extraction_log(session, document.id)
    dropped = [entry for entry in entries if entry.outcome == "dropped"]
    assert len(dropped) == 2
    assert all(entry.stage == "signal_parser" for entry in dropped)


def test_location_with_all_fields_null_is_not_attached(tmp_path: Path) -> None:
    session = _session(tmp_path)
    document = _document(session)
    client = FakeLmStudioClient(
        {
            document.content: [
                FakeEventSpec(
                    title="Protest",
                    summary="A large protest occurred.",
                    evidence_quote="A large protest occurred at the capitol in Jakarta",
                    locations=[{"country": None, "admin1": None, "city_regency": None}],
                )
            ]
        }
    )

    result = _run(session, document, client)

    assert result.saved_events[0].locations == []


def test_location_is_kept_when_only_one_of_two_named_fields_is_grounded(tmp_path: Path) -> None:
    session = _session(tmp_path)
    document = _document(session, content="A large protest occurred at the capitol in Jakarta.")
    client = FakeLmStudioClient(
        {
            document.content: [
                FakeEventSpec(
                    title="Protest",
                    summary="A large protest occurred.",
                    evidence_quote="A large protest occurred at the capitol in Jakarta",
                    locations=[
                        {
                            "country": "IDN",
                            "admin1": "Unmentioned Province",
                            "city_regency": "Jakarta",
                        }
                    ],
                )
            ]
        }
    )

    result = _run(session, document, client)

    assert len(result.saved_events[0].locations) == 1
    assert result.saved_events[0].locations[0].admin1 == "Unmentioned Province"
    entries = list_extraction_log(session, document.id)
    assert not any(entry.outcome == "dropped" for entry in entries)


def test_signal_parser_failure_raises_and_saves_nothing(tmp_path: Path) -> None:
    session = _session(tmp_path)
    document = _document(session)
    client = FakeLmStudioClient(
        {document.content: LmStudioResponseError("LM Studio returned malformed output.")}
    )

    with pytest.raises(LmStudioResponseError):
        _run(session, document, client)

    assert session.execute(select(Event)).scalars().all() == []


def test_location_with_ungrounded_admin1_and_city_regency_is_dropped_and_logged(
    tmp_path: Path,
) -> None:
    session = _session(tmp_path)
    document = _document(session, content="A large protest occurred at the capitol.")
    client = FakeLmStudioClient(
        {
            document.content: [
                FakeEventSpec(
                    title="Protest",
                    summary="A large protest occurred.",
                    evidence_quote="A large protest occurred at the capitol.",
                    locations=[
                        {"country": "IDN", "admin1": "Jakarta", "city_regency": "Jakarta"}
                    ],
                )
            ]
        }
    )

    result = _run(session, document, client)

    assert result.saved_events[0].locations == []
    entries = list_extraction_log(session, document.id)
    dropped = [entry for entry in entries if entry.stage == "locations" and entry.outcome == "dropped"]
    assert len(dropped) == 1


def test_location_with_only_country_is_trusted_without_grounding(tmp_path: Path) -> None:
    session = _session(tmp_path)
    document = _document(session, content="A large protest occurred at the capitol.")
    client = FakeLmStudioClient(
        {
            document.content: [
                FakeEventSpec(
                    title="Protest",
                    summary="A large protest occurred.",
                    evidence_quote="A large protest occurred at the capitol.",
                    locations=[{"country": "IDN", "admin1": None, "city_regency": None}],
                )
            ]
        }
    )

    result = _run(session, document, client)

    assert len(result.saved_events[0].locations) == 1
    assert result.saved_events[0].locations[0].country == "IDN"


def test_unknown_event_type_is_saved_blank_without_creating_a_type(tmp_path: Path) -> None:
    session = _session(tmp_path)
    document = _document(session)
    client = FakeLmStudioClient(
        {
            document.content: [
                FakeEventSpec(
                    title="Protest",
                    summary="A large protest occurred.",
                    evidence_quote="A large protest occurred at the capitol in Jakarta",
                    event_type="Nonexistent Type",
                )
            ]
        }
    )

    result = _run(session, document, client)

    assert result.saved_events[0].event_type is None
    assert session.execute(select(EventType)).scalars().all() == []


def test_new_actor_is_created_inactive_and_existing_actor_is_reused(tmp_path: Path) -> None:
    session = _session(tmp_path)
    document = _document(session)
    known_actor = Actor(name="Ministry of Health", is_active=True)
    session.add(known_actor)
    session.commit()
    client = FakeLmStudioClient(
        {
            document.content: [
                FakeEventSpec(
                    title="Protest",
                    summary="A large protest occurred.",
                    evidence_quote="A large protest occurred at the capitol in Jakarta",
                    source_actors=["Ministry of Health"],
                    recipient_actors=["Unknown Group"],
                )
            ]
        }
    )

    result = _run(session, document, client, known_actors=["Ministry of Health"])

    event = result.saved_events[0]
    by_name = {link.actor.name: (link.actor, link.role) for link in event.event_actors}
    assert by_name["Ministry of Health"][0].id == known_actor.id
    assert by_name["Ministry of Health"][1] == "source"
    assert by_name["Unknown Group"][0].is_active is False
    assert by_name["Unknown Group"][1] == "target"
    assert session.execute(select(Actor)).scalars().all().__len__() == 2


def test_actor_alias_resolves_to_the_existing_actor_instead_of_creating_a_new_one(
    tmp_path: Path,
) -> None:
    session = _session(tmp_path)
    document = _document(session)
    known_actor = Actor(name="United States", is_active=True)
    known_actor.aliases.append(ActorAlias(alias="US"))
    session.add(known_actor)
    session.commit()
    client = FakeLmStudioClient(
        {
            document.content: [
                FakeEventSpec(
                    title="Protest",
                    summary="A large protest occurred.",
                    evidence_quote="A large protest occurred at the capitol in Jakarta",
                    source_actors=["US"],
                )
            ]
        }
    )

    result = _run(session, document, client, known_actors=["United States"])

    event = result.saved_events[0]
    assert [link.actor.id for link in event.event_actors] == [known_actor.id]
    assert session.execute(select(Actor)).scalars().all() == [known_actor]


def test_persisted_event_links_back_to_document_source_with_evidence_quote(
    tmp_path: Path,
) -> None:
    session = _session(tmp_path)
    document = _document(session)
    client = FakeLmStudioClient(
        {
            document.content: [
                FakeEventSpec(
                    title="Protest",
                    summary="A large protest occurred.",
                    evidence_quote="A large protest occurred at the capitol in Jakarta",
                )
            ]
        }
    )

    result = _run(session, document, client)

    event_source = result.saved_events[0].event_sources[0]
    assert event_source.source.document_id == document.id
    assert event_source.evidence_quote == "A large protest occurred at the capitol in Jakarta"


def test_full_path_active_taxonomy_type_is_linked(tmp_path: Path) -> None:
    session = _session(tmp_path)
    document = _document(session)
    confirmed_type = EventType(name="Protest", is_active=True)
    domain = TaxonomyNode(name="Civic", level="domain")
    category = TaxonomyNode(name="Public activity", level="category", parent=domain)
    subcategory = TaxonomyNode(name="Demonstrations", level="subcategory", parent=category)
    leaf = TaxonomyNode(
        name="Protest", level="event_type", parent=subcategory, event_type=confirmed_type
    )
    session.add(leaf)
    session.commit()
    client = FakeLmStudioClient(
        {
            document.content: [
                FakeEventSpec(
                    title="Protest",
                    summary="A large protest occurred.",
                    evidence_quote="A large protest occurred at the capitol in Jakarta",
                    event_type="Protest",
                )
            ]
        }
    )

    result = _run(session, document, client)

    assert result.saved_events[0].event_type_id == confirmed_type.id
