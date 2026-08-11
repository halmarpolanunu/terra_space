"""PostgreSQL persistence sentinel check.

Run this inside the backend container, against the app's own TERRA_DATABASE_URL -- see
project-knowledge/plans/2026-08-10-terra-space-supabase-transition.md (Task 6):

    docker compose exec backend python tools/Test-Persistence.py insert
    docker compose restart backend
    docker compose exec backend python tools/Test-Persistence.py

Modes:
  insert   Create a disposable sentinel Event Type row directly with SQL. Event Types cannot be
           created through the API on their own (see app/api/routes/events.py -- that route is
           410 Gone by design; Event Types are created through the taxonomy tree instead), so a
           direct INSERT is the only way to place this one, disposable row.
  (none)   Default. Confirms the sentinel row survived a restart, then removes it through the
           real DELETE /api/event-types/{id} endpoint -- never with a raw destructive SQL DELETE.
  inspect  Prints the live table names and Alembic version for debugging.
"""

import os
import sys
import urllib.error
import urllib.request

import psycopg

SENTINEL_ID = "phase1-sentinel"
SENTINEL_NAME = "Phase 1 Sentinel"
BACKEND_EVENT_TYPE_URL = f"http://127.0.0.1:8000/api/event-types/{SENTINEL_ID}"


def _database_url() -> str:
    url = os.environ.get("TERRA_DATABASE_URL")
    if not url:
        raise SystemExit(
            "TERRA_DATABASE_URL is not set in this container's environment. Run this inside the "
            "backend container, where it is already configured."
        )
    return url


def insert() -> None:
    with psycopg.connect(_database_url()) as connection:
        connection.execute(
            """
            INSERT INTO terra_space_phase3_event_types (id, name, description, is_active, created_at, updated_at)
            VALUES (%s, %s, '', true, now(), now())
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = now()
            """,
            (SENTINEL_ID, SENTINEL_NAME),
        )
        connection.commit()
    print("Sentinel inserted. Now restart the backend, then run this script again with no argument.")


def inspect() -> None:
    with psycopg.connect(_database_url()) as connection:
        tables = connection.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
        ).fetchall()
        print(tables)
        version = connection.execute("SELECT version_num FROM alembic_version").fetchall()
        print(version)


def verify_and_cleanup() -> None:
    with psycopg.connect(_database_url()) as connection:
        row = connection.execute(
            "SELECT name FROM terra_space_phase3_event_types WHERE id = %s", (SENTINEL_ID,)
        ).fetchone()
    assert row == (SENTINEL_NAME,), f"Sentinel row did not survive the restart: {row!r}"
    print("Persistence check passed: the sentinel row survived a backend restart.")

    # Clean up through the real API -- never with a direct destructive SQL DELETE (see
    # project-knowledge/plans/2026-08-10-terra-space-supabase-transition.md, Task 6).
    request = urllib.request.Request(BACKEND_EVENT_TYPE_URL, method="DELETE")
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            status = response.status
    except urllib.error.HTTPError as error:
        raise SystemExit(f"Cleanup DELETE failed with status {error.code}: {error.read().decode()}") from error
    if status != 204:
        raise SystemExit(f"Cleanup DELETE returned unexpected status {status}.")
    print("Sentinel removed through DELETE /api/event-types/{id} (no raw SQL delete).")


def main() -> None:
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    if mode == "insert":
        insert()
    elif mode == "inspect":
        inspect()
    else:
        verify_and_cleanup()


if __name__ == "__main__":
    main()
