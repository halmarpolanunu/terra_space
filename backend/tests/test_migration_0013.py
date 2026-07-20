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


def test_upgrade_creates_actor_aliases_table(tmp_path: Path) -> None:
    config = _config(tmp_path)
    command.upgrade(config, "0013_actor_aliases")
    engine = _engine(config)

    columns = {column["name"] for column in inspect(engine).get_columns("actor_aliases")}
    assert {"id", "actor_id", "alias", "created_at", "updated_at"} <= columns


def test_deleting_an_actor_cascades_to_its_aliases(tmp_path: Path) -> None:
    config = _config(tmp_path)
    command.upgrade(config, "0013_actor_aliases")
    engine = _engine(config)

    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO actors (id, name, is_active, created_at, updated_at) VALUES "
                "('actor-1', 'United States', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            )
        )
        connection.execute(
            text(
                "INSERT INTO actor_aliases (id, actor_id, alias, created_at, updated_at) "
                "VALUES ('alias-1', 'actor-1', 'US', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            )
        )

    with engine.begin() as connection:
        connection.execute(text("DELETE FROM actors WHERE id = 'actor-1'"))

    with engine.connect() as connection:
        remaining = connection.execute(text("SELECT COUNT(*) FROM actor_aliases")).scalar_one()
        foreign_key_violations = connection.execute(text("PRAGMA foreign_key_check")).all()

    assert remaining == 0
    assert foreign_key_violations == []


def test_downgrade_drops_actor_aliases_table(tmp_path: Path) -> None:
    config = _config(tmp_path)
    command.upgrade(config, "0013_actor_aliases")
    engine = _engine(config)

    command.downgrade(config, "0012_event_extraction_incomplete")

    assert "actor_aliases" not in inspect(engine).get_table_names()
