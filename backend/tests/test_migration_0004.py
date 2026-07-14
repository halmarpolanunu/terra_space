from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text


def _config(tmp_path: Path) -> Config:
    database_file = tmp_path / "migrated.db"
    backend_dir = Path(__file__).resolve().parents[1]
    config = Config(str(backend_dir / "alembic.ini"))
    config.set_main_option("script_location", str(backend_dir / "alembic"))
    config.set_main_option("sqlalchemy.url", f"sqlite:///{database_file}")
    return config


def test_migration_backfills_coordinates_for_locations_saved_before_phase_4(tmp_path: Path) -> None:
    config = _config(tmp_path)
    command.upgrade(config, "0003_phase4_events_dashboard")
    engine = create_engine(config.get_main_option("sqlalchemy.url"))
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO locations (id, country, admin1, city_regency, latitude, longitude, "
                "coordinate_precision, created_at, updated_at) "
                "VALUES ('legacy', 'AD', NULL, NULL, NULL, NULL, NULL, "
                "'2026-07-01T00:00:00', '2026-07-01T00:00:00')"
            )
        )
        connection.execute(
            text(
                "INSERT INTO locations (id, country, admin1, city_regency, latitude, longitude, "
                "coordinate_precision, created_at, updated_at) "
                "VALUES ('unresolvable', 'ZZ', 'Nowhere', NULL, NULL, NULL, NULL, "
                "'2026-07-01T00:00:00', '2026-07-01T00:00:00')"
            )
        )
        connection.execute(
            text(
                "INSERT INTO locations (id, country, admin1, city_regency, latitude, longitude, "
                "coordinate_precision, created_at, updated_at) "
                "VALUES ('already-set', 'AD', NULL, NULL, 1.0, 2.0, 'country', "
                "'2026-07-01T00:00:00', '2026-07-01T00:00:00')"
            )
        )

    command.upgrade(config, "head")
    with engine.connect() as connection:
        rows = {
            row.id: row
            for row in connection.execute(
                text("SELECT id, latitude, longitude, coordinate_precision FROM locations")
            ).all()
        }

    assert rows["legacy"].latitude == 42.50779
    assert rows["legacy"].longitude == 1.52109
    assert rows["legacy"].coordinate_precision == "country"

    assert rows["unresolvable"].latitude is None
    assert rows["unresolvable"].longitude is None

    assert rows["already-set"].latitude == 1.0
    assert rows["already-set"].longitude == 2.0
