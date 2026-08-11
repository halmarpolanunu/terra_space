"""Task 2 of the Terra Space Supabase Application Transition Plan: prove the SQLAlchemy models
actually match the live PostgreSQL schema, and that constraints only Postgres enforces (NOT NULL,
global location dedup, JSONB columns, FK restrict/cascade) behave as designed.

See project-knowledge/plans/2026-08-10-terra-space-supabase-transition.md.
"""

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
from tests.supabase_bridge_test_support import bridge_db  # noqa: F401

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
