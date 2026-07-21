from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import IntegrityError


def _migrated_engine(tmp_path: Path, revision: str = "0002_phase2_data_model"):
    database_file = tmp_path / "migrated.db"
    backend_dir = Path(__file__).resolve().parents[1]
    config = Config(str(backend_dir / "alembic.ini"))
    config.set_main_option("script_location", str(backend_dir / "alembic"))
    config.set_main_option("sqlalchemy.url", f"sqlite:///{database_file}")

    command.upgrade(config, revision)

    return create_engine(f"sqlite:///{database_file}")


def _column(engine, table: str, name: str) -> dict:
    columns = {column["name"]: column for column in inspect(engine).get_columns(table)}
    assert name in columns, f"expected column {name!r} on {table!r}"
    return columns[name]


def test_migration_reaches_current_head(tmp_path: Path) -> None:
    engine = _migrated_engine(tmp_path, "head")
    with engine.connect() as connection:
        assert (
            connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
            == "0014_event_candidate_index"
        )


def test_documents_gain_document_date_publication_date_and_processing_error(
    tmp_path: Path,
) -> None:
    engine = _migrated_engine(tmp_path)
    assert _column(engine, "documents", "document_date")["nullable"] is False
    assert _column(engine, "documents", "publication_date")["nullable"] is True
    assert _column(engine, "documents", "processing_error")["nullable"] is True


def test_actors_gain_is_active_flag(tmp_path: Path) -> None:
    engine = _migrated_engine(tmp_path)
    assert _column(engine, "actors", "is_active")["nullable"] is False


def test_event_sources_gain_evidence_quote(tmp_path: Path) -> None:
    engine = _migrated_engine(tmp_path)
    assert _column(engine, "event_sources", "evidence_quote")["nullable"] is True


def test_locations_latitude_and_longitude_accept_numeric_values(tmp_path: Path) -> None:
    engine = _migrated_engine(tmp_path)
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO locations (id, latitude, longitude, created_at, updated_at) "
                "VALUES ('loc-1', 6.200000, 106.816666, '2026-07-14T00:00:00', '2026-07-14T00:00:00')"
            )
        )
        row = connection.execute(
            text("SELECT latitude, longitude FROM locations WHERE id = 'loc-1'")
        ).one()
        assert float(row.latitude) == pytest.approx(6.2)
        assert float(row.longitude) == pytest.approx(106.816666)


def test_event_actors_allows_same_pair_with_different_roles_but_rejects_exact_duplicate(
    tmp_path: Path,
) -> None:
    engine = _migrated_engine(tmp_path)
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO event_actors (event_id, actor_id, role) VALUES ('e1', 'a1', 'source')"
            )
        )
        connection.execute(
            text(
                "INSERT INTO event_actors (event_id, actor_id, role) VALUES ('e1', 'a1', 'target')"
            )
        )

    with pytest.raises(IntegrityError):
        with engine.begin() as connection:
            connection.execute(
                text(
                    "INSERT INTO event_actors (event_id, actor_id, role) VALUES ('e1', 'a1', 'source')"
                )
            )


def test_duplicate_flags_table_has_expected_columns_and_foreign_keys(tmp_path: Path) -> None:
    engine = _migrated_engine(tmp_path)
    inspector = inspect(engine)
    assert "duplicate_flags" in inspector.get_table_names()

    columns = {column["name"] for column in inspector.get_columns("duplicate_flags")}
    assert columns >= {
        "id",
        "draft_event_id",
        "matched_event_id",
        "matched_reason",
        "resolution",
        "resolved_at",
    }

    referred_tables = {fk["referred_table"] for fk in inspector.get_foreign_keys("duplicate_flags")}
    assert referred_tables == {"events"}
