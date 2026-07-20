from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, event, inspect, text


def _config(tmp_path: Path) -> Config:
    database_file = tmp_path / "migrated.db"
    backend_dir = Path(__file__).resolve().parents[1]
    config = Config(str(backend_dir / "alembic.ini"))
    config.set_main_option("script_location", str(backend_dir / "alembic"))
    config.set_main_option("sqlalchemy.url", f"sqlite:///{database_file}")
    return config


def _engine(config: Config):
    engine = create_engine(config.get_main_option("sqlalchemy.url"))

    @event.listens_for(engine, "connect")
    def _enable_foreign_keys(dbapi_connection, _connection_record) -> None:  # type: ignore[no-untyped-def]
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    return engine


def test_upgrade_creates_extraction_log_entries_table(tmp_path: Path) -> None:
    config = _config(tmp_path)
    command.upgrade(config, "0011_extraction_log_entries")
    engine = _engine(config)

    columns = {
        column["name"] for column in inspect(engine).get_columns("extraction_log_entries")
    }
    assert columns == {
        "id",
        "document_id",
        "candidate_index",
        "stage",
        "outcome",
        "detail",
        "created_at",
    }


def test_deleting_a_document_cascades_to_extraction_log_entries(tmp_path: Path) -> None:
    config = _config(tmp_path)
    command.upgrade(config, "0011_extraction_log_entries")
    engine = _engine(config)

    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO documents "
                "(id, title, content, publication_date, input_date, processing_status, "
                "created_at, updated_at) VALUES "
                "('doc-1', 'Document', 'Content', '2026-07-10', CURRENT_TIMESTAMP, "
                "'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            )
        )
        connection.execute(
            text(
                "INSERT INTO extraction_log_entries "
                "(id, document_id, candidate_index, stage, outcome, detail, created_at) "
                "VALUES ('log-1', 'doc-1', NULL, 'signal_parser', 'ok', 'Parsed.', "
                "CURRENT_TIMESTAMP)"
            )
        )

    with engine.begin() as connection:
        connection.execute(text("DELETE FROM documents WHERE id = 'doc-1'"))

    with engine.connect() as connection:
        remaining = connection.execute(
            text("SELECT COUNT(*) FROM extraction_log_entries")
        ).scalar_one()
        foreign_key_violations = connection.execute(text("PRAGMA foreign_key_check")).all()

    assert remaining == 0
    assert foreign_key_violations == []


def test_downgrade_drops_extraction_log_entries_table(tmp_path: Path) -> None:
    config = _config(tmp_path)
    command.upgrade(config, "0011_extraction_log_entries")
    engine = _engine(config)

    command.downgrade(config, "0010_iso_alpha3_country_codes")

    assert "extraction_log_entries" not in inspect(engine).get_table_names()
