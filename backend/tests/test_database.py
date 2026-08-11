"""Tests for the archived SQLite Alembic migration chain.

`app/db/models.py` now describes the PostgreSQL/Supabase schema (see
project-knowledge/plans/2026-08-10-terra-space-supabase-transition.md), completely independent of
these frozen Alembic migration files -- Alembic's own job is preserving the ability to rebuild and
inspect the archived SQLite rollback database exactly as it was, so these tests intentionally
never import `app.db.models` and instead assert on the migration chain's own raw SQL output.
"""

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text


def test_alembic_migration_creates_foundation_schema(tmp_path: Path) -> None:
    database_file = tmp_path / "nested" / "migrated.db"
    backend_dir = Path(__file__).resolve().parents[1]
    config = Config(str(backend_dir / "alembic.ini"))
    config.set_main_option("script_location", str(backend_dir / "alembic"))
    config.set_main_option("sqlalchemy.url", f"sqlite:///{database_file}")

    command.upgrade(config, "head")

    engine = create_engine(f"sqlite:///{database_file}")
    expected = {"documents", "attachments", "events", "event_types", "alembic_version"}
    assert expected <= set(inspect(engine).get_table_names())
    with engine.connect() as connection:
        assert (
            connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
                == "0014_event_candidate_index"
        )
    event_type_columns = {
        column["name"]: column for column in inspect(engine).get_columns("event_types")
    }
    assert event_type_columns["description"]["nullable"] is True
    document_columns = {
        column["name"]: column for column in inspect(engine).get_columns("documents")
    }
    event_columns = {column["name"] for column in inspect(engine).get_columns("events")}
    assert document_columns["publication_date"]["nullable"] is False
    assert "document_date" not in document_columns
    assert {"event_date", "event_date_precision"} <= event_columns
    assert not {"start_date", "end_date", "start_date_precision", "end_date_precision"} & event_columns


def test_event_type_description_migration_preserves_legacy_rows(tmp_path: Path) -> None:
    database_file = tmp_path / "migration.db"
    backend_dir = Path(__file__).resolve().parents[1]
    config = Config(str(backend_dir / "alembic.ini"))
    config.set_main_option("script_location", str(backend_dir / "alembic"))
    config.set_main_option("sqlalchemy.url", f"sqlite:///{database_file}")
    command.upgrade(config, "0006_lm_studio_timeout")
    engine = create_engine(f"sqlite:///{database_file}")
    with engine.begin() as connection:
        connection.execute(text(
            "INSERT INTO event_types "
            "(id, name, is_active, created_at, updated_at) "
            "VALUES ('legacy', 'Legacy', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
        ))

    command.upgrade(config, "0007_event_type_descriptions")
    with engine.connect() as connection:
        assert connection.execute(text(
            "SELECT description FROM event_types WHERE id = 'legacy'"
        )).scalar_one() is None

    command.downgrade(config, "0006_lm_studio_timeout")
    assert "description" not in {
        column["name"] for column in inspect(engine).get_columns("event_types")
    }
    command.upgrade(config, "head")
    assert "description" in {
        column["name"] for column in inspect(engine).get_columns("event_types")
    }
