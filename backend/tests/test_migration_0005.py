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


def test_migration_creates_nullable_app_settings_table(tmp_path: Path) -> None:
    config = _config(tmp_path)
    command.upgrade(config, "0005_phase5_app_settings")
    engine = create_engine(config.get_main_option("sqlalchemy.url"))
    inspector = inspect(engine)

    assert "app_settings" in inspector.get_table_names()
    columns = {column["name"]: column for column in inspector.get_columns("app_settings")}
    assert columns["lm_studio_base_url"]["nullable"] is True
    assert columns["lm_studio_model"]["nullable"] is True
    with engine.connect() as connection:
        version = connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
        assert version == "0005_phase5_app_settings"


def test_migration_downgrade_removes_app_settings_table(tmp_path: Path) -> None:
    config = _config(tmp_path)
    command.upgrade(config, "0005_phase5_app_settings")
    command.downgrade(config, "0004_coordinate_backfill")
    engine = create_engine(config.get_main_option("sqlalchemy.url"))

    assert "app_settings" not in inspect(engine).get_table_names()
