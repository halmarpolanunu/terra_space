"""Read-only connection to the local Supabase/PostgreSQL database.

This is deliberately separate from `app/db/session.py`, which owns the SQLite database that
the rest of the application reads and writes. Nothing here maps an ORM model, creates a table,
or runs a write statement. Every connection this engine hands out is placed in a genuine
PostgreSQL read-only transaction, so even a bug in this codebase cannot insert, update, or
delete a Supabase row -- PostgreSQL itself rejects the statement.

See project-knowledge/plans/2026-08-11-supabase-read-only-bridge-design.md.
"""

import psycopg.types.string
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine


def create_supabase_read_only_engine(database_url: str) -> Engine:
    """Create an engine whose every connection runs inside `SET TRANSACTION READ ONLY`.

    This is database-level enforcement, not just a coding convention: PostgreSQL raises
    `cannot execute ... in a read-only transaction` for any INSERT/UPDATE/DELETE/DDL issued
    through a connection from this engine, regardless of what the calling Python code does.
    """

    engine = create_engine(
        database_url,
        pool_pre_ping=True,
        execution_options={"postgresql_readonly": True},
    )

    @event.listens_for(engine, "connect")
    def _load_uuid_columns_as_plain_strings(dbapi_connection, _connection_record) -> None:  # type: ignore[no-untyped-def]
        # The bridge's Pydantic schemas declare id fields as `str`. psycopg3 otherwise loads
        # `uuid` columns as `uuid.UUID` objects, which fails that validation; every ID this
        # bridge deals with is only ever read, compared, or serialized as text, never
        # constructed as a UUID, so plain strings are simplest.
        dbapi_connection.adapters.register_loader("uuid", psycopg.types.string.TextLoader)

    return engine
