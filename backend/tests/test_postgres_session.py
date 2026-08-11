"""Task 1 of the Terra Space Supabase Application Transition Plan: dialect-aware session setup.

See project-knowledge/plans/2026-08-10-terra-space-supabase-transition.md.
"""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.config import Settings
from app.db.session import create_session_factory
from app.main import create_app
from tests.postgres_test_support import postgres_db, postgres_session_factory  # noqa: F401
from tests.supabase_bridge_test_support import TEST_DATABASE_URL, require_bridge_database


def test_settings_database_url_is_unset_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("TERRA_DATABASE_URL", raising=False)

    assert Settings().database_url is None


def test_create_app_refuses_to_start_without_a_database_url(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("TERRA_DATABASE_URL", raising=False)

    with pytest.raises(RuntimeError, match="TERRA_DATABASE_URL is not set"):
        create_app(settings=Settings(data_dir=tmp_path), lm_studio_check=lambda: False)


def test_create_app_starts_with_an_explicit_sqlite_url_for_tests(tmp_path: Path) -> None:
    app = create_app(
        settings=Settings(data_dir=tmp_path, database_url=f"sqlite:///{tmp_path / 'test.db'}"),
        lm_studio_check=lambda: False,
    )

    response = TestClient(app).get("/api/health")

    assert response.status_code == 200


def test_sqlite_session_factory_creates_its_own_schema(tmp_path: Path) -> None:
    session_factory = create_session_factory(f"sqlite:///{tmp_path / 'test.db'}")

    with session_factory() as session:
        # Base.metadata.create_all already ran; querying a known ORM table must not fail.
        count = session.execute(
            text("select count(*) from terra_space_phase1_sources")
        ).scalar_one()

    assert count == 0


def test_postgres_session_factory_never_auto_creates_schema(postgres_session_factory) -> None:  # noqa: F811
    """The disposable Postgres database already has the real Supabase migrations applied (via
    `require_bridge_database`). If `create_session_factory` ever called `Base.metadata.create_all`
    against it, this would find the old SQLite-shaped `documents` table sitting alongside the real
    `terra_space_phase1_sources` table -- which must never happen."""

    with postgres_session_factory() as session:
        exists = session.execute(
            text("select to_regclass('public.documents') is not null")
        ).scalar_one()
        real_table_exists = session.execute(
            text("select to_regclass('public.terra_space_phase1_sources') is not null")
        ).scalar_one()

    assert exists is False
    assert real_table_exists is True


def test_create_app_starts_against_the_real_postgres_test_service(tmp_path: Path) -> None:
    require_bridge_database()
    app = create_app(
        settings=Settings(data_dir=tmp_path, database_url=TEST_DATABASE_URL),
        lm_studio_check=lambda: False,
    )

    response = TestClient(app).get("/api/health")

    assert response.status_code == 200
