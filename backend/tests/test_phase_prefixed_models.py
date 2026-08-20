"""Task 2 of the Terra Space Supabase Application Transition Plan: prove the SQLAlchemy models
actually match the live PostgreSQL schema, and that constraints only Postgres enforces (NOT NULL,
global location dedup, JSONB columns, FK restrict/cascade) behave as designed.

See project-knowledge/plans/2026-08-10-terra-space-supabase-transition.md.
"""

import json
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import psycopg
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError

from app.db.models import (
    Actor,
    ActorAlias,
    Attachment,
    Document,
    DuplicateFlag,
    Event,
    EventActor,
    EventSource,
    EventType,
    Location,
    TaxonomyNode,
)
from app.services.locations import get_or_create_location
from tests.postgres_test_support import postgres_db, postgres_session_factory  # noqa: F401
from tests.supabase_bridge_test_support import TEST_DATABASE_DSN, bridge_db  # noqa: F401

# Every ORM model mapped in Task 2, and the live table it must match.
_MAPPED_MODELS = [
    Document,
    Attachment,
    EventType,
    TaxonomyNode,
    Actor,
    ActorAlias,
    Location,
    Event,
    EventActor,
    EventSource,
    DuplicateFlag,
]


def test_every_mapped_table_and_column_exists_in_postgres(postgres_db) -> None:  # noqa: F811
    inspector = inspect(postgres_db.get_bind())
    live_tables = set(inspector.get_table_names(schema="public"))

    for model in _MAPPED_MODELS:
        table_name = model.__tablename__
        assert table_name in live_tables, f"{model.__name__} maps to a table that doesn't exist: {table_name}"
        live_columns = {column["name"] for column in inspector.get_columns(table_name, schema="public")}
        mapped_columns = {column.name for column in model.__table__.columns}
        missing = mapped_columns - live_columns
        assert not missing, f"{model.__name__} maps columns that don't exist on {table_name}: {missing}"


def test_event_type_description_is_not_null_on_the_live_table(bridge_db, postgres_db) -> None:  # noqa: F811
    event_type = EventType(name="Drift check type", is_active=True)
    # Never assigning `description` leaves it "unset"; the Python-side default ("") should apply,
    # matching the live NOT NULL constraint, without the caller having to remember this.
    postgres_db.add(event_type)
    postgres_db.commit()
    postgres_db.refresh(event_type)

    assert event_type.description == ""


def test_locations_dedupe_globally_by_normalized_place(bridge_db, postgres_db) -> None:  # noqa: F811
    """Unlike the old SQLite `locations` table, terra_space_phase3_locations has a real unique
    index on the normalized place -- two events at the same place must share one row, or the
    live database rejects the second insert."""

    first = get_or_create_location(postgres_db, "IDN", "Jakarta", None)
    postgres_db.commit()
    second = get_or_create_location(postgres_db, "idn", "jakarta", None)
    postgres_db.commit()

    assert first.id == second.id

    # Confirm the live unique index would genuinely reject a bypassing raw insert -- proving
    # get_or_create_location's dedup isn't just app-level convention.
    try:
        postgres_db.execute(
            text(
                "insert into public.terra_space_phase3_locations (country_iso3, admin1) "
                "values ('IDN', 'Jakarta')"
            )
        )
        postgres_db.commit()
    except IntegrityError:
        postgres_db.rollback()
    else:
        raise AssertionError("expected the live unique index to reject a duplicate place")


def test_pipeline_event_creation_reuses_one_location_when_candidates_arrive_together(
    bridge_db,
) -> None:  # noqa: F811
    """Regression for execution 1697: simultaneous Syrian candidates must share one location.

    The authority function is the production boundary n8n calls. This deliberately uses separate
    PostgreSQL connections, matching n8n's parallel HTTP requests, rather than testing a helper.
    """

    source_id = bridge_db.execute(
        """
        insert into public.terra_space_phase1_sources
            (title, publication_date, raw_content_text, cleaned_content_text, source_domain,
             source_url, author, collection_source)
        values ('Concurrent location source', '2026-08-11', 'Raw.', 'Cleaned.', 'example.test',
                'https://example.test/concurrent', 'Test author', 'test')
        returning id
        """
    ).fetchone()[0]
    candidate_count = 8
    start_together = Barrier(candidate_count)

    def create_event(index: int) -> str:
        payload = {
            "candidate_key": f"concurrent-syria-{index}",
            "phase1_source_id": str(source_id),
            "pipeline_outcome": "EXCEPTION",
            "title": f"Concurrent Syria event {index}",
            "summary": "Candidates refer to the same country-level location.",
            "epistemic_status": "unknown",
            "locations": [
                {
                    "country_iso3": "SYR",
                    "latitude": 33.5102,
                    "longitude": 36.29128,
                    "coordinate_precision": "country",
                }
            ],
        }
        with psycopg.connect(TEST_DATABASE_DSN, autocommit=True) as connection:
            start_together.wait()
            return str(
                connection.execute(
                    "select public.terra_space_phase3_create_pipeline_event(%s::jsonb)",
                    (json.dumps(payload),),
                ).fetchone()[0]
            )

    with ThreadPoolExecutor(max_workers=candidate_count) as executor:
        event_ids = list(executor.map(create_event, range(candidate_count)))

    assert len(set(event_ids)) == candidate_count
    location_count = bridge_db.execute(
        """
        select count(*) from public.terra_space_phase3_locations
        where country_iso3 = 'SYR' and admin1 is null and city_regency is null
        """
    ).fetchone()[0]
    linked_event_count = bridge_db.execute(
        """
        select count(distinct event_id)
        from public.terra_space_phase3_event_locations event_locations
        join public.terra_space_phase3_locations locations
          on locations.id = event_locations.location_id
        where locations.country_iso3 = 'SYR'
          and locations.admin1 is null
          and locations.city_regency is null
        """
    ).fetchone()[0]

    assert location_count == 1
    assert linked_event_count == candidate_count


def test_deleting_a_source_referenced_by_an_event_is_blocked_by_the_database(
    bridge_db,  # noqa: F811
    postgres_db,  # noqa: F811
) -> None:
    """terra_space_phase3_events.phase1_source_id is ON DELETE RESTRICT on the live table --
    confirms the database itself protects authoritative intelligence, not just app code."""

    document = Document(
        title="Source",
        content="Evidence text.",
        publication_date="2026-08-01",
        collection_source="terra_space_ui",
    )
    postgres_db.add(document)
    postgres_db.flush()
    event = Event(
        title="Event",
        summary="Summary.",
        epistemic_status="confirmed",
        origin="manual",
        dashboard_status="hidden",
        phase1_source_id=document.id,
    )
    event.event_sources.append(EventSource(source=document, evidence_quote="Evidence text."))
    postgres_db.add(event)
    postgres_db.commit()

    try:
        postgres_db.delete(document)
        postgres_db.commit()
    except IntegrityError:
        postgres_db.rollback()
    else:
        raise AssertionError("expected the live FK to block deleting a referenced source")
