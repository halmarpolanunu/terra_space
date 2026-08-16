"""Task 2 of the Terra Space Supabase Application Transition Plan: prove the SQLAlchemy models
actually match the live PostgreSQL schema, and that constraints only Postgres enforces (NOT NULL,
global location dedup, JSONB columns, FK restrict/cascade) behave as designed.

See project-knowledge/plans/2026-08-10-terra-space-supabase-transition.md.
"""

import uuid

import psycopg
import pytest
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
from tests.supabase_bridge_test_support import bridge_db, insert_source  # noqa: F401

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


def test_issue_first_relationship_rejects_two_source_endpoints(bridge_db) -> None:  # noqa: F811
    """A relationship is directional: accepting two sources would let the globe draw an
    unsupported actor pairing. The database, rather than the future UI, must reject it."""

    source_id = insert_source(bridge_db, cleaned_content_text="Source and target evidence.")
    run_id = str(uuid.uuid4())
    issue_id = str(uuid.uuid4())
    event_id = str(uuid.uuid4())
    relationship_id = str(uuid.uuid4())
    location_id = str(uuid.uuid4())

    bridge_db.execute(
        """
        insert into public.terra_space_issue_v2_runs
            (id, source_id, status, stage, processed_at)
        values (%s, %s, 'succeeded', 'complete', now())
        """,
        (run_id, source_id),
    )
    bridge_db.execute(
        """
        insert into public.terra_space_issue_v2_issues
            (id, run_id, source_id, label, summary, evidence_quote, validated_at)
        values (%s, %s, %s, 'Issue', 'Issue summary', 'Source and target evidence.', now())
        """,
        (issue_id, run_id, source_id),
    )
    bridge_db.execute(
        """
        insert into public.terra_space_issue_v2_events
            (id, issue_id, run_id, title, evidence_quote, validated_at)
        values (%s, %s, %s, 'Event', 'Source and target evidence.', now())
        """,
        (event_id, issue_id, run_id),
    )
    bridge_db.execute(
        """
        insert into public.terra_space_issue_v2_relationships
            (id, event_id, evidence_quote)
        values (%s, %s, 'Source and target evidence.')
        """,
        (relationship_id, event_id),
    )
    bridge_db.execute(
        """
        insert into public.terra_space_issue_v2_locations
            (id, label, latitude, longitude, evidence_quote)
        values (%s, 'Jakarta', -6.2, 106.8, 'Source and target evidence.')
        """,
        (location_id,),
    )
    bridge_db.execute(
        """
        insert into public.terra_space_issue_v2_relationship_endpoints
            (relationship_id, role, actor_name, location_id, evidence_quote)
        values (%s, 'source', 'Source actor', %s, 'Source and target evidence.')
        """,
        (relationship_id, location_id),
    )

    with pytest.raises(psycopg.errors.UniqueViolation):
        bridge_db.execute(
            """
            insert into public.terra_space_issue_v2_relationship_endpoints
                (relationship_id, role, actor_name, location_id, evidence_quote)
            values (%s, 'source', 'Another source actor', %s, 'Source and target evidence.')
            """,
            (relationship_id, location_id),
        )


def test_issue_first_valid_views_exclude_unvalidated_and_failed_results(bridge_db) -> None:  # noqa: F811
    """A pipeline result that was not validated, or whose run failed, must never become
    analysis data even though the diagnostic rows remain stored for observability."""

    source_id = insert_source(bridge_db, cleaned_content_text="Valid analysis evidence.")
    valid_run_id = str(uuid.uuid4())
    failed_run_id = str(uuid.uuid4())
    valid_issue_id = str(uuid.uuid4())
    failed_issue_id = str(uuid.uuid4())
    valid_event_id = str(uuid.uuid4())
    unvalidated_event_id = str(uuid.uuid4())

    bridge_db.execute(
        """
        insert into public.terra_space_issue_v2_runs
            (id, source_id, status, stage, reason, processed_at)
        values
            (%s, %s, 'succeeded', 'complete', null, now()),
            (%s, %s, 'failed', 'validation', 'Evidence was not grounded.', now())
        """,
        (valid_run_id, source_id, failed_run_id, source_id),
    )
    bridge_db.execute(
        """
        insert into public.terra_space_issue_v2_issues
            (id, run_id, source_id, label, summary, evidence_quote, validated_at)
        values
            (%s, %s, %s, 'Valid issue', 'Summary', 'Valid analysis evidence.', now()),
            (%s, %s, %s, 'Failed issue', 'Summary', 'Valid analysis evidence.', now())
        """,
        (valid_issue_id, valid_run_id, source_id, failed_issue_id, failed_run_id, source_id),
    )
    bridge_db.execute(
        """
        insert into public.terra_space_issue_v2_events
            (id, issue_id, run_id, title, evidence_quote, validated_at)
        values
            (%s, %s, %s, 'Valid event', 'Valid analysis evidence.', now()),
            (%s, %s, %s, 'Unvalidated event', 'Valid analysis evidence.', null)
        """,
        (valid_event_id, valid_issue_id, valid_run_id, unvalidated_event_id, valid_issue_id, valid_run_id),
    )

    visible_issue_ids = {
        row[0]
        for row in bridge_db.execute("select id from public.terra_space_issue_v2_valid_issues")
    }
    visible_event_ids = {
        row[0]
        for row in bridge_db.execute("select id from public.terra_space_issue_v2_valid_events")
    }

    assert visible_issue_ids == {uuid.UUID(valid_issue_id)}
    assert visible_event_ids == {uuid.UUID(valid_event_id)}


def test_issue_first_relationship_cannot_be_validated_without_a_target_endpoint(bridge_db) -> None:  # noqa: F811
    """A half-grounded relationship must remain withheld: a validated arc needs both the
    source and target locations the article explicitly supports."""

    source_id = insert_source(bridge_db, cleaned_content_text="Only the source location is stated.")
    run_id = str(uuid.uuid4())
    issue_id = str(uuid.uuid4())
    event_id = str(uuid.uuid4())
    relationship_id = str(uuid.uuid4())
    location_id = str(uuid.uuid4())
    bridge_db.execute(
        """insert into public.terra_space_issue_v2_runs
           (id, source_id, status, stage, processed_at)
           values (%s, %s, 'succeeded', 'complete', now())""",
        (run_id, source_id),
    )
    bridge_db.execute(
        """insert into public.terra_space_issue_v2_issues
           (id, run_id, source_id, label, summary, evidence_quote, validated_at)
           values (%s, %s, %s, 'Issue', 'Summary', 'Only the source location is stated.', now())""",
        (issue_id, run_id, source_id),
    )
    bridge_db.execute(
        """insert into public.terra_space_issue_v2_events
           (id, issue_id, run_id, title, evidence_quote, validated_at)
           values (%s, %s, %s, 'Event', 'Only the source location is stated.', now())""",
        (event_id, issue_id, run_id),
    )
    bridge_db.execute(
        """insert into public.terra_space_issue_v2_relationships
           (id, event_id, evidence_quote)
           values (%s, %s, 'Only the source location is stated.')""",
        (relationship_id, event_id),
    )
    bridge_db.execute(
        """insert into public.terra_space_issue_v2_locations
           (id, label, latitude, longitude, evidence_quote)
           values (%s, 'Jakarta', -6.2, 106.8, 'Only the source location is stated.')""",
        (location_id,),
    )
    bridge_db.execute(
        """insert into public.terra_space_issue_v2_relationship_endpoints
           (relationship_id, role, actor_name, location_id, evidence_quote)
           values (%s, 'source', 'Source actor', %s, 'Only the source location is stated.')""",
        (relationship_id, location_id),
    )

    with pytest.raises(psycopg.errors.CheckViolation):
        bridge_db.execute(
            """update public.terra_space_issue_v2_relationships
               set validated_at = now()
             where id = %s""",
            (relationship_id,),
        )
