"""Shared setup for backend tests exercising the *primary* (read-write) application connection
against a real PostgreSQL database.

Reuses the exact same disposable database and migration-application logic already proven by the
Supabase read-only bridge's own tests (`supabase_bridge_test_support.py`) -- this is deliberately
not a second, near-identical disposable Postgres service. The only difference here is the engine:
this module builds the application's own primary, read-write `create_session_factory` engine
against that database, instead of the bridge's forced-read-only engine.

Start the shared disposable database first (same one the bridge tests use):

    docker compose -f docker-compose.supabase-bridge-test.yml up -d
"""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from sqlalchemy.orm import Session, sessionmaker

from app.db.session import create_session_factory
from tests.supabase_bridge_test_support import TEST_DATABASE_URL, require_bridge_database


@pytest.fixture(scope="session")
def postgres_session_factory() -> sessionmaker:
    """The app's own primary (read-write) session factory, against the disposable test database."""

    require_bridge_database()
    return create_session_factory(TEST_DATABASE_URL)


@pytest.fixture
def postgres_db(postgres_session_factory: sessionmaker) -> Iterator[Session]:
    """A primary-connection session for one test. Callers truncate whatever tables they touch."""

    session = postgres_session_factory()
    try:
        yield session
    finally:
        session.close()
