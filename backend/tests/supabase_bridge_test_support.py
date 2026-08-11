"""Shared setup for backend tests that read from an isolated PostgreSQL database.

This intentionally never touches the real local Supabase deployment (D:\\local-supabase).
Start the disposable database first:

    docker compose -f docker-compose.supabase-bridge-test.yml up -d

Every test that needs it calls `require_bridge_database()`, which skips the test with a clear
message if that database is not reachable, so the rest of the backend suite keeps working
without Docker.
"""

from __future__ import annotations

import uuid
from collections.abc import Iterator
from pathlib import Path

import psycopg
import pytest
from sqlalchemy.engine import Engine

from app.db.supabase_bridge import create_supabase_read_only_engine

TEST_DATABASE_URL = "postgresql+psycopg://postgres:postgres@127.0.0.1:55432/terra_space_bridge_test"
_PSYCOPG_DSN = "host=127.0.0.1 port=55432 dbname=terra_space_bridge_test user=postgres password=postgres"

_SUPABASE_DIR = Path(__file__).resolve().parents[2] / "supabase"
# The legacy-table rename migration is skipped here on purpose: a fresh test database never had
# the pre-phase-prefix production tables it renames (terra_space_news_v2 and friends), so it has
# nothing to do here. See the implementation plan's "Pre-existing discrepancy" section.
_MIGRATIONS_IN_ORDER = [
    _SUPABASE_DIR / "migrations" / "202608100001_fresh_phase_prefixed_foundation.sql",
    _SUPABASE_DIR / "migrations" / "20260811125624_rename_active_tables_to_terra_space_prefix.sql",
    _SUPABASE_DIR / "migrations" / "20260811125738_refresh_renamed_pipeline_authority_function.sql",
]

_BUSINESS_TABLES_FK_SAFE_ORDER = [
    "terra_space_phase3_duplicate_flags",
    "terra_space_phase3_event_locations",
    "terra_space_phase3_event_actors",
    "terra_space_phase3_event_sources",
    "terra_space_phase3_event_runs",
    "terra_space_phase3_events",
    "terra_space_phase3_locations",
    "terra_space_phase3_actor_aliases",
    "terra_space_phase3_actors",
    "terra_space_phase3_taxonomy_nodes",
    "terra_space_phase3_event_types",
    "terra_space_phase2_candidate_runs",
    "terra_space_phase2_event_candidates",
    "terra_space_phase1_attachments",
    "terra_space_phase1_processing_runs",
    "terra_space_phase1_sources",
]


def _connect() -> psycopg.Connection:
    return psycopg.connect(_PSYCOPG_DSN, autocommit=True)


def _schema_ready(conn: psycopg.Connection) -> bool:
    row = conn.execute(
        "select to_regclass('public.terra_space_phase1_sources') is not null"
    ).fetchone()
    return bool(row and row[0])


def _ensure_schema(conn: psycopg.Connection) -> None:
    if _schema_ready(conn):
        return
    for role in ("anon", "authenticated", "service_role"):
        conn.execute(
            f"do $$ begin "  # noqa: S608 -- role names are a fixed local literal set, not input
            f"if not exists (select from pg_roles where rolname = '{role}') then "
            f"create role {role}; end if; end $$;"
        )
    for migration_file in _MIGRATIONS_IN_ORDER:
        conn.execute(migration_file.read_text(encoding="utf-8"))


def require_bridge_database() -> None:
    """Skip the calling test if the disposable bridge test database is not reachable."""

    try:
        conn = _connect()
    except psycopg.OperationalError:
        pytest.skip(
            "Supabase bridge test database is not running. Start it with: "
            "docker compose -f docker-compose.supabase-bridge-test.yml up -d"
        )
    with conn:
        _ensure_schema(conn)


@pytest.fixture(scope="session")
def bridge_read_only_engine() -> Iterator[Engine]:
    require_bridge_database()
    engine = create_supabase_read_only_engine(TEST_DATABASE_URL)
    yield engine
    engine.dispose()


@pytest.fixture
def bridge_db() -> Iterator[psycopg.Connection]:
    """A writable connection for test setup only -- never used by application code."""

    require_bridge_database()
    conn = _connect()
    for table in _BUSINESS_TABLES_FK_SAFE_ORDER:
        conn.execute(f"truncate table public.{table} cascade")  # noqa: S608 -- fixed table list
    try:
        yield conn
    finally:
        conn.close()


def insert_source(conn: psycopg.Connection, **overrides: object) -> str:
    values = {
        "id": str(uuid.uuid4()),
        "title": "Test source",
        "publication_date": "2026-08-01",
        "raw_content_text": "Raw text.",
        "cleaned_content_text": "Cleaned text.",
        "source_domain": "example.com",
        "source_url": "https://example.com/article",
        "author": "A reporter",
        "collection_source": "manual_input",
        "processing_status": "completed",
    }
    values.update(overrides)
    conn.execute(
        """
        insert into public.terra_space_phase1_sources
            (id, title, publication_date, raw_content_text, cleaned_content_text,
             source_domain, source_url, author, collection_source, processing_status)
        values (%(id)s, %(title)s, %(publication_date)s, %(raw_content_text)s,
                %(cleaned_content_text)s, %(source_domain)s, %(source_url)s, %(author)s,
                %(collection_source)s, %(processing_status)s)
        """,
        values,
    )
    return values["id"]


def insert_candidate_result(conn: psycopg.Connection, phase1_source_id: str, **overrides: object) -> None:
    import json

    values = {
        "id": str(uuid.uuid4()),
        "phase1_source_id": phase1_source_id,
        "main_issue_status": "MAIN_ISSUE_FOUND",
        "main_issue": json.dumps(
            {
                "label": "Test main issue",
                "summary": "Summary.",
                "evidence_quote": "Quote.",
                "evidence_start": 0,
                "evidence_end": 5,
                "quote_grounded": True,
            }
        ),
        "event_detection_status": "EVENT_CANDIDATES_FOUND",
        "event_candidates": json.dumps(
            [
                {
                    "working_title": "Test candidate",
                    "classification": "ENTITY_CENTRED_CHANGE",
                    "phenomenon": "Something happened.",
                    "entities": ["Entity A"],
                    "evidence_quote": "Quote.",
                    "evidence_start": 0,
                    "evidence_end": 5,
                    "quote_grounded": True,
                }
            ]
        ),
        "model_name": "test-model",
        "prompt_version": "test-v1",
        "processed_at": "2026-08-01T00:00:00Z",
    }
    values.update(overrides)
    conn.execute(
        """
        insert into public.terra_space_phase2_event_candidates
            (id, phase1_source_id, main_issue_status, main_issue, event_detection_status,
             event_candidates, model_name, prompt_version, processed_at)
        values (%(id)s, %(phase1_source_id)s, %(main_issue_status)s, %(main_issue)s,
                %(event_detection_status)s, %(event_candidates)s, %(model_name)s,
                %(prompt_version)s, %(processed_at)s)
        """,
        values,
    )


def insert_event_type(conn: psycopg.Connection, name: str = "Test Event Type") -> str:
    type_id = str(uuid.uuid4())
    conn.execute(
        """
        insert into public.terra_space_phase3_event_types (id, name, description, is_active)
        values (%s, %s, %s, true)
        """,
        (type_id, name, "A test event type."),
    )
    return type_id


def insert_actor(conn: psycopg.Connection, name: str) -> str:
    actor_id = str(uuid.uuid4())
    conn.execute(
        "insert into public.terra_space_phase3_actors (id, name, is_active) values (%s, %s, true)",
        (actor_id, name),
    )
    return actor_id


def insert_location(conn: psycopg.Connection, **overrides: object) -> str:
    values = {
        "id": str(uuid.uuid4()),
        "country_iso3": "IDN",
        "admin1": None,
        "city_regency": None,
        "latitude": -6.2,
        "longitude": 106.8,
        "coordinate_precision": "country",
    }
    values.update(overrides)
    conn.execute(
        """
        insert into public.terra_space_phase3_locations
            (id, country_iso3, admin1, city_regency, latitude, longitude, coordinate_precision)
        values (%(id)s, %(country_iso3)s, %(admin1)s, %(city_regency)s, %(latitude)s,
                %(longitude)s, %(coordinate_precision)s)
        """,
        values,
    )
    return values["id"]


def insert_event_run(
    conn: psycopg.Connection,
    candidate_key: str,
    phase1_source_id: str,
    **overrides: object,
) -> None:
    """Insert one append-only phase3_event_runs row -- used to test exception_reason lookup."""

    import json

    values = {
        "candidate_key": candidate_key,
        "phase1_source_id": phase1_source_id,
        "attempt_number": 2,
        "candidate": json.dumps({}),
        "factual_status": "SUCCESS",
        "taxonomy_status": "CLASSIFIED",
        "safeguard_status": "REJECT",
        "safeguard_reasons": json.dumps(["Evidence quote does not support the claimed actor."]),
        "error_message": None,
        "processed_at": "2026-08-01T00:00:00Z",
        "outcome_payload": json.dumps({}),
    }
    values.update(overrides)
    conn.execute(
        """
        insert into public.terra_space_phase3_event_runs
            (candidate_key, phase1_source_id, attempt_number, candidate, factual_status,
             taxonomy_status, safeguard_status, safeguard_reasons, error_message, processed_at,
             outcome_payload)
        values (%(candidate_key)s, %(phase1_source_id)s, %(attempt_number)s, %(candidate)s,
                %(factual_status)s, %(taxonomy_status)s, %(safeguard_status)s,
                %(safeguard_reasons)s, %(error_message)s, %(processed_at)s, %(outcome_payload)s)
        """,
        values,
    )


def insert_event(
    conn: psycopg.Connection,
    phase1_source_id: str,
    *,
    event_type_id: str | None = None,
    actor_ids: list[tuple[str, str]] | None = None,
    location_ids: list[str] | None = None,
    **overrides: object,
) -> str:
    """Insert one phase3_events row plus its actor/location/source junction rows.

    `actor_ids` is a list of (actor_id, role) pairs.
    """

    values = {
        "id": str(uuid.uuid4()),
        "candidate_key": f"{overrides.get('id', str(uuid.uuid4()))}:0:5",
        "phase1_source_id": phase1_source_id,
        "origin": "pipeline",
        "pipeline_outcome": "FINAL",
        "dashboard_status": "published",
        "title": "Test event",
        "summary": "Something happened.",
        "event_date": "2026-08-01",
        "event_date_precision": "exact",
        "epistemic_status": "confirmed",
        "event_type_id": event_type_id,
        "pipeline_candidate": "{}",
        "pipeline_event_snapshot": "{}",
    }
    values.update({k: v for k, v in overrides.items() if k in values})
    conn.execute(
        """
        insert into public.terra_space_phase3_events
            (id, candidate_key, phase1_source_id, origin, pipeline_outcome, dashboard_status,
             title, summary, event_date, event_date_precision, epistemic_status, event_type_id,
             pipeline_candidate, pipeline_event_snapshot)
        values (%(id)s, %(candidate_key)s, %(phase1_source_id)s, %(origin)s, %(pipeline_outcome)s,
                %(dashboard_status)s, %(title)s, %(summary)s, %(event_date)s,
                %(event_date_precision)s, %(epistemic_status)s, %(event_type_id)s,
                %(pipeline_candidate)s, %(pipeline_event_snapshot)s)
        """,
        values,
    )
    event_id = values["id"]
    for actor_id, role in actor_ids or []:
        conn.execute(
            "insert into public.terra_space_phase3_event_actors (event_id, actor_id, role) "
            "values (%s, %s, %s)",
            (event_id, actor_id, role),
        )
    for location_id in location_ids or []:
        conn.execute(
            "insert into public.terra_space_phase3_event_locations (event_id, location_id) "
            "values (%s, %s)",
            (event_id, location_id),
        )
    conn.execute(
        "insert into public.terra_space_phase3_event_sources "
        "(event_id, phase1_source_id, reference_label, evidence_quote) values (%s, %s, %s, %s)",
        (event_id, phase1_source_id, values["title"], "Quote."),
    )
    return event_id
