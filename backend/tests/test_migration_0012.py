from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text


def _config(tmp_path: Path) -> Config:
    database_file = tmp_path / "migrated.db"
    backend_dir = Path(__file__).resolve().parents[1]
    config = Config(str(backend_dir / "alembic.ini"))
    config.set_main_option("script_location", str(backend_dir / "alembic"))
    config.set_main_option("sqlalchemy.url", f"sqlite:///{database_file}")
    return config


def test_upgrade_adds_extraction_incomplete_defaulting_to_false(tmp_path: Path) -> None:
    config = _config(tmp_path)
    command.upgrade(config, "0011_extraction_log_entries")
    engine = create_engine(config.get_main_option("sqlalchemy.url"))

    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO events "
                "(id, title, summary, epistemic_status, review_status, created_at, "
                "updated_at) VALUES "
                "('pre-existing-event', 'Event', 'Summary', 'confirmed', 'draft', "
                "CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            )
        )

    command.upgrade(config, "0012_event_extraction_incomplete")

    columns = {column["name"] for column in inspect(engine).get_columns("events")}
    assert "extraction_incomplete" in columns
    with engine.connect() as connection:
        value = connection.execute(
            text("SELECT extraction_incomplete FROM events WHERE id = 'pre-existing-event'")
        ).scalar_one()
    assert value == 0


def test_downgrade_drops_extraction_incomplete(tmp_path: Path) -> None:
    config = _config(tmp_path)
    command.upgrade(config, "0012_event_extraction_incomplete")
    engine = create_engine(config.get_main_option("sqlalchemy.url"))

    command.downgrade(config, "0011_extraction_log_entries")

    columns = {column["name"] for column in inspect(engine).get_columns("events")}
    assert "extraction_incomplete" not in columns
