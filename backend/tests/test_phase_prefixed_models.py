"""Task 2 of the Terra Space Supabase Application Transition Plan: prove the SQLAlchemy models
actually match the live PostgreSQL schema, and that constraints only Postgres enforces (NOT NULL,
global location dedup, JSONB columns, FK restrict/cascade) behave as designed.

See project-knowledge/plans/2026-08-10-terra-space-supabase-transition.md.
"""

import json
import uuid
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import psycopg
import pytest
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError

from app.data.iso3166_alpha2_to_alpha3 import ALPHA2_TO_ALPHA3
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
from tests.supabase_bridge_test_support import (  # noqa: F401
    TEST_DATABASE_DSN,
    bridge_db,
    insert_source,
)

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
            (%s, %s, 'succeeded', 'complete', null, now() + interval '1 minute'),
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


def _create_validated_issue_first_relationship(bridge_db) -> dict[str, str]:
    """Create one complete, validated relationship for endpoint-mutation tests."""

    source_id = insert_source(bridge_db, cleaned_content_text="Both actor locations are stated.")
    run_id = str(uuid.uuid4())
    issue_id = str(uuid.uuid4())
    event_id = str(uuid.uuid4())
    relationship_id = str(uuid.uuid4())
    source_location_id = str(uuid.uuid4())
    target_location_id = str(uuid.uuid4())
    bridge_db.execute(
        """insert into public.terra_space_issue_v2_runs
           (id, source_id, status, stage, processed_at)
           values (%s, %s, 'succeeded', 'complete', now())""",
        (run_id, source_id),
    )
    bridge_db.execute(
        """insert into public.terra_space_issue_v2_issues
           (id, run_id, source_id, label, summary, evidence_quote, validated_at)
           values (%s, %s, %s, 'Issue', 'Summary', 'Both actor locations are stated.', now())""",
        (issue_id, run_id, source_id),
    )
    bridge_db.execute(
        """insert into public.terra_space_issue_v2_events
           (id, issue_id, run_id, title, evidence_quote, validated_at)
           values (%s, %s, %s, 'Event', 'Both actor locations are stated.', now())""",
        (event_id, issue_id, run_id),
    )
    bridge_db.execute(
        """insert into public.terra_space_issue_v2_relationships
           (id, event_id, evidence_quote)
           values (%s, %s, 'Both actor locations are stated.')""",
        (relationship_id, event_id),
    )
    bridge_db.execute(
        """insert into public.terra_space_issue_v2_locations
           (id, label, latitude, longitude, evidence_quote)
           values
             (%s, 'Jakarta', -6.2, 106.8, 'Both actor locations are stated.'),
             (%s, 'Bandung', -6.9, 107.6, 'Both actor locations are stated.')""",
        (source_location_id, target_location_id),
    )
    bridge_db.execute(
        """insert into public.terra_space_issue_v2_relationship_endpoints
           (relationship_id, role, actor_name, location_id, evidence_quote)
           values
             (%s, 'source', 'Source actor', %s, 'Both actor locations are stated.'),
             (%s, 'target', 'Target actor', %s, 'Both actor locations are stated.')""",
        (relationship_id, source_location_id, relationship_id, target_location_id),
    )
    bridge_db.execute(
        """update public.terra_space_issue_v2_relationships
              set validated_at = now()
            where id = %s""",
        (relationship_id,),
    )
    return {
        "source_id": source_id,
        "run_id": run_id,
        "event_id": event_id,
        "relationship_id": relationship_id,
    }


def test_issue_first_issue_source_must_match_its_run_source(bridge_db) -> None:  # noqa: F811
    """An Issue from article B must never be attached to the run that processed article A."""

    run_source_id = insert_source(bridge_db, title="Run source")
    other_source_id = insert_source(bridge_db, title="Other source")
    run_id = str(uuid.uuid4())
    bridge_db.execute(
        """insert into public.terra_space_issue_v2_runs
           (id, source_id, status, stage, processed_at)
           values (%s, %s, 'succeeded', 'complete', now())""",
        (run_id, run_source_id),
    )

    with pytest.raises(psycopg.errors.ForeignKeyViolation):
        bridge_db.execute(
            """insert into public.terra_space_issue_v2_issues
               (id, run_id, source_id, label, summary, evidence_quote, validated_at)
               values (%s, %s, %s, 'Wrong source', 'Summary', 'Evidence.', now())""",
            (str(uuid.uuid4()), run_id, other_source_id),
        )


def test_issue_first_endpoint_delete_cannot_break_a_validated_relationship(bridge_db) -> None:  # noqa: F811
    """Deleting one end of a visible arc must fail instead of leaving a false relationship."""

    record = _create_validated_issue_first_relationship(bridge_db)

    with pytest.raises(psycopg.errors.CheckViolation):
        bridge_db.execute(
            """delete from public.terra_space_issue_v2_relationship_endpoints
                 where relationship_id = %s and role = 'target'""",
            (record["relationship_id"],),
        )


def test_issue_first_endpoint_move_cannot_break_a_validated_relationship(bridge_db) -> None:  # noqa: F811
    """Moving an endpoint away from a visible arc must also fail, not silently unground it."""

    record = _create_validated_issue_first_relationship(bridge_db)
    destination_relationship_id = str(uuid.uuid4())
    bridge_db.execute(
        """insert into public.terra_space_issue_v2_relationships
           (id, event_id, evidence_quote)
           values (%s, %s, 'Both actor locations are stated.')""",
        (destination_relationship_id, record["event_id"]),
    )

    with pytest.raises(psycopg.errors.CheckViolation):
        bridge_db.execute(
            """update public.terra_space_issue_v2_relationship_endpoints
                  set relationship_id = %s
                where relationship_id = %s and role = 'target'""",
            (destination_relationship_id, record["relationship_id"]),
        )


def test_issue_first_runs_cannot_be_updated_or_deleted(bridge_db) -> None:  # noqa: F811
    """Pipeline run history is audit data, so neither rewrite nor removal is allowed."""

    source_id = insert_source(bridge_db)
    run_id = str(uuid.uuid4())
    bridge_db.execute(
        """insert into public.terra_space_issue_v2_runs
           (id, source_id, status, stage, processed_at)
           values (%s, %s, 'succeeded', 'complete', now())""",
        (run_id, source_id),
    )

    with pytest.raises(psycopg.errors.ObjectNotInPrerequisiteState):
        bridge_db.execute(
            "update public.terra_space_issue_v2_runs set stage = 'changed' where id = %s",
            (run_id,),
        )
    with pytest.raises(psycopg.errors.ObjectNotInPrerequisiteState):
        bridge_db.execute(
            "delete from public.terra_space_issue_v2_runs where id = %s",
            (run_id,),
        )


def test_issue_first_rejects_generic_korea_for_south_korea_when_article_says_north_korea(
    bridge_db,
) -> None:  # noqa: F811
    """A substring must not turn an explicit North Korea claim into a South Korea map arc."""

    source_text = "Source Actor in North Korea addressed Target Actor in North Korea."
    source_id = insert_source(bridge_db, cleaned_content_text=source_text, raw_content_text=source_text)
    payload = {
        "source_id": source_id,
        "main_issue": {
            "label": "North Korea statement",
            "summary": "A statement involved two actors.",
            "evidence_quote": source_text,
        },
        "events": [
            {
                "title": "Statement",
                "evidence_quote": source_text,
                "relationships": [
                    {
                        "evidence_quote": source_text,
                        "source": {
                            "name": "Source Actor",
                            "country_iso3": "KOR",
                            "country_name": "Korea",
                            "evidence_quote": source_text,
                        },
                        "target": {
                            "name": "Target Actor",
                            "country_iso3": "KOR",
                            "country_name": "Korea",
                            "evidence_quote": source_text,
                        },
                    }
                ],
            }
        ],
    }

    run_id = bridge_db.execute(
        "select public.terra_space_issue_v2_record_run(%s::jsonb)",
        (json.dumps(payload),),
    ).fetchone()[0]
    status, reason = bridge_db.execute(
        "select status, reason from public.terra_space_issue_v2_runs where id = %s", (run_id,)
    ).fetchone()

    assert status == "failed"
    assert "country text does not match country_iso3 KOR" in reason


def test_issue_first_country_reference_covers_every_checked_in_country_code(bridge_db) -> None:  # noqa: F811
    """The pipeline's SQL reference must stay aligned with the project-wide code source."""

    reference_codes = {
        row[0]
        for row in bridge_db.execute(
            "select country_iso3 from public.terra_space_issue_v2_country_reference"
        )
    }

    assert reference_codes == set(ALPHA2_TO_ALPHA3.values())
