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


def test_migration_adds_nullable_approval_and_coordinate_precision_columns(tmp_path: Path) -> None:
    config = _config(tmp_path)
    command.upgrade(config, "0003_phase4_events_dashboard")
    engine = create_engine(config.get_main_option("sqlalchemy.url"))
    inspector = inspect(engine)

    event_columns = {column["name"]: column for column in inspector.get_columns("events")}
    location_columns = {column["name"]: column for column in inspector.get_columns("locations")}
    assert event_columns["approved_at"]["nullable"] is True
    assert location_columns["coordinate_precision"]["nullable"] is True
    with engine.connect() as connection:
        assert connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one() == "0003_phase4_events_dashboard"


def test_migration_backfills_only_existing_approved_events(tmp_path: Path) -> None:
    config = _config(tmp_path)
    command.upgrade(config, "0002_phase2_data_model")
    engine = create_engine(config.get_main_option("sqlalchemy.url"))
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO events (id, title, summary, epistemic_status, review_status, created_at, updated_at) "
                "VALUES ('approved', 'Approved', 'Summary', 'confirmed', 'approved', '2026-07-01T00:00:00', '2026-07-02T03:04:05')"
            )
        )
        connection.execute(
            text(
                "INSERT INTO events (id, title, summary, epistemic_status, review_status, created_at, updated_at) "
                "VALUES ('draft', 'Draft', 'Summary', 'confirmed', 'draft', '2026-07-01T00:00:00', '2026-07-02T03:04:05')"
            )
        )

    command.upgrade(config, "head")
    with engine.connect() as connection:
        rows = connection.execute(
            text("SELECT id, approved_at FROM events ORDER BY id")
        ).all()

    assert rows[0].id == "approved"
    assert str(rows[0].approved_at) == "2026-07-02T03:04:05"
    assert rows[1].id == "draft"
    assert rows[1].approved_at is None
