"""Prove an installation at the original Issue-first migration can move forward safely."""

from __future__ import annotations

import uuid
from pathlib import Path

import psycopg
import pytest

from tests.supabase_bridge_test_support import insert_source, require_bridge_database

_ROOT = Path(__file__).resolve().parents[2]
_MIGRATIONS = _ROOT / "supabase" / "migrations"
_UPGRADE_MIGRATION = _MIGRATIONS / "202608160002_issue_first_integrity_upgrade.sql"
_TEST_DSN = "host=127.0.0.1 port=55432 dbname=terra_space_bridge_test user=postgres password=postgres"


def _database_dsn(database_name: str) -> str:
    return _TEST_DSN.replace("dbname=terra_space_bridge_test", f"dbname={database_name}")


def _create_roles(conn: psycopg.Connection) -> None:
    for role in ("anon", "authenticated", "service_role"):
        conn.execute(
            f"do $$ begin "  # noqa: S608 -- fixed local role names, not input
            f"if not exists (select from pg_roles where rolname = '{role}') then "
            f"create role {role}; end if; end $$;"
        )


def test_issue_first_integrity_upgrade_protects_the_original_schema() -> None:
    """The forward migration must protect a database that already has the initial v2 tables."""

    require_bridge_database()
    database_name = f"issue_first_upgrade_{uuid.uuid4().hex}"
    with psycopg.connect(_database_dsn("postgres"), autocommit=True) as admin:
        admin.execute(f'create database "{database_name}"')  # noqa: S608 -- generated UUID-only identifier
    try:
        with psycopg.connect(_database_dsn(database_name), autocommit=True) as conn:
            _create_roles(conn)
            for migration_name in (
                "202608100001_fresh_phase_prefixed_foundation.sql",
                "20260811125624_rename_active_tables_to_terra_space_prefix.sql",
                "20260811125738_refresh_renamed_pipeline_authority_function.sql",
                "202608160001_issue_first_parallel.sql",
            ):
                conn.execute((_MIGRATIONS / migration_name).read_text(encoding="utf-8"))

            # This is the state an installation at b2d389a has before the forward upgrade.
            assert conn.execute(
                """select count(*) from pg_constraint
                   where conrelid = 'terra_space.terra_space_issue_v2_issues'::regclass
                     and contype = 'f'
                     and pg_get_constraintdef(oid) like '%(run_id, source_id)%'"""
            ).fetchone()[0] == 0

            conn.execute(_UPGRADE_MIGRATION.read_text(encoding="utf-8"))

            run_source_id = insert_source(conn, title="Run source")
            other_source_id = insert_source(conn, title="Other source")
            run_id = str(uuid.uuid4())
            conn.execute(
                """insert into terra_space.terra_space_issue_v2_runs
                   (id, source_id, status, stage, processed_at)
                   values (%s, %s, 'succeeded', 'complete', now())""",
                (run_id, run_source_id),
            )
            with pytest.raises(psycopg.errors.ForeignKeyViolation):
                conn.execute(
                    """insert into terra_space.terra_space_issue_v2_issues
                       (id, run_id, source_id, label, summary, evidence_quote, validated_at)
                       values (%s, %s, %s, 'Wrong source', 'Summary', 'Evidence.', now())""",
                    (str(uuid.uuid4()), run_id, other_source_id),
                )

            issue_id = str(uuid.uuid4())
            event_id = str(uuid.uuid4())
            relationship_id = str(uuid.uuid4())
            destination_relationship_id = str(uuid.uuid4())
            source_location_id = str(uuid.uuid4())
            target_location_id = str(uuid.uuid4())
            conn.execute(
                """insert into terra_space.terra_space_issue_v2_issues
                   (id, run_id, source_id, label, summary, evidence_quote, validated_at)
                   values (%s, %s, %s, 'Issue', 'Summary', 'Both locations are stated.', now())""",
                (issue_id, run_id, run_source_id),
            )
            conn.execute(
                """insert into terra_space.terra_space_issue_v2_events
                   (id, issue_id, run_id, title, evidence_quote, validated_at)
                   values (%s, %s, %s, 'Event', 'Both locations are stated.', now())""",
                (event_id, issue_id, run_id),
            )
            conn.execute(
                """insert into terra_space.terra_space_issue_v2_relationships
                   (id, event_id, evidence_quote)
                   values
                     (%s, %s, 'Both locations are stated.'),
                     (%s, %s, 'Both locations are stated.')""",
                (relationship_id, event_id, destination_relationship_id, event_id),
            )
            conn.execute(
                """insert into terra_space.terra_space_issue_v2_locations
                   (id, label, latitude, longitude, evidence_quote)
                   values
                     (%s, 'Jakarta', -6.2, 106.8, 'Both locations are stated.'),
                     (%s, 'Bandung', -6.9, 107.6, 'Both locations are stated.')""",
                (source_location_id, target_location_id),
            )
            conn.execute(
                """insert into terra_space.terra_space_issue_v2_relationship_endpoints
                   (relationship_id, role, actor_name, location_id, evidence_quote)
                   values
                     (%s, 'source', 'Source actor', %s, 'Both locations are stated.'),
                     (%s, 'target', 'Target actor', %s, 'Both locations are stated.')""",
                (relationship_id, source_location_id, relationship_id, target_location_id),
            )
            conn.execute(
                """update terra_space.terra_space_issue_v2_relationships
                      set validated_at = now()
                    where id = %s""",
                (relationship_id,),
            )
            with pytest.raises(psycopg.errors.CheckViolation):
                conn.execute(
                    """delete from terra_space.terra_space_issue_v2_relationship_endpoints
                         where relationship_id = %s and role = 'target'""",
                    (relationship_id,),
                )
            with pytest.raises(psycopg.errors.CheckViolation):
                conn.execute(
                    """update terra_space.terra_space_issue_v2_relationship_endpoints
                          set relationship_id = %s
                        where relationship_id = %s and role = 'target'""",
                    (destination_relationship_id, relationship_id),
                )
    finally:
        with psycopg.connect(_database_dsn("postgres"), autocommit=True) as admin:
            admin.execute(
                "select pg_terminate_backend(pid) from pg_stat_activity "
                "where datname = %s and pid <> pg_backend_pid()",
                (database_name,),
            )
            admin.execute(f'drop database if exists "{database_name}"')  # noqa: S608 -- generated UUID-only identifier
