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


def test_upgrade_adds_nullable_candidate_index(tmp_path: Path) -> None:
    config = _config(tmp_path)
    command.upgrade(config, "0013_actor_aliases")
    engine = create_engine(config.get_main_option("sqlalchemy.url"))

    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO events "
                "(id, title, summary, epistemic_status, review_status, extraction_incomplete, "
                "created_at, updated_at) VALUES "
                "('pre-existing-event', 'Event', 'Summary', 'confirmed', 'draft', 0, "
                "CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            )
        )

    command.upgrade(config, "0014_event_candidate_index")

    columns = {column["name"] for column in inspect(engine).get_columns("events")}
    assert "candidate_index" in columns
    with engine.connect() as connection:
        value = connection.execute(
            text("SELECT candidate_index FROM events WHERE id = 'pre-existing-event'")
        ).scalar_one()
    assert value is None


def test_downgrade_drops_candidate_index(tmp_path: Path) -> None:
    config = _config(tmp_path)
    command.upgrade(config, "0014_event_candidate_index")
    engine = create_engine(config.get_main_option("sqlalchemy.url"))

    command.downgrade(config, "0013_actor_aliases")

    columns = {column["name"] for column in inspect(engine).get_columns("events")}
    assert "candidate_index" not in columns
