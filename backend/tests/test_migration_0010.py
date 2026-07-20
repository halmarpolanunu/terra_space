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


def _seed(engine) -> None:  # type: ignore[no-untyped-def]
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
                "INSERT INTO events "
                "(id, title, summary, epistemic_status, review_status, created_at, "
                "updated_at) VALUES "
                "('event-1', 'Event', 'Summary', 'confirmed', 'draft', CURRENT_TIMESTAMP, "
                "CURRENT_TIMESTAMP)"
            )
        )
        connection.execute(
            text(
                "INSERT INTO locations "
                "(id, country, admin1, city_regency, latitude, longitude, created_at, "
                "updated_at) VALUES "
                "('loc-lowercase-id', 'id', 'Jakarta', 'Jakarta', -6.21462, 106.84513, "
                "CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), "
                "('loc-ye', 'YE', 'Sana''a', NULL, NULL, NULL, CURRENT_TIMESTAMP, "
                "CURRENT_TIMESTAMP), "
                "('loc-null', NULL, NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP, "
                "CURRENT_TIMESTAMP), "
                "('loc-unknown', 'ZZ', NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP, "
                "CURRENT_TIMESTAMP)"
            )
        )
        connection.execute(
            text(
                "INSERT INTO event_locations (event_id, location_id) VALUES "
                "('event-1', 'loc-lowercase-id')"
            )
        )


def _country_values(engine) -> dict[str, str | None]:  # type: ignore[no-untyped-def]
    with engine.connect() as connection:
        rows = connection.execute(text("SELECT id, country FROM locations")).all()
    return dict(rows)


def test_upgrade_converts_stored_alpha2_country_codes_to_alpha3(tmp_path: Path) -> None:
    config = _config(tmp_path)
    command.upgrade(config, "0009_event_taxonomy_tree")
    engine = _engine(config)
    _seed(engine)

    command.upgrade(config, "0010_iso_alpha3_country_codes")

    assert _country_values(engine) == {
        "loc-lowercase-id": "IDN",
        "loc-ye": "YEM",
        "loc-null": None,
        "loc-unknown": "ZZ",
    }

    with engine.connect() as connection:
        event_location = connection.execute(
            text("SELECT location_id FROM event_locations WHERE event_id = 'event-1'")
        ).scalar_one()
        foreign_key_violations = connection.execute(text("PRAGMA foreign_key_check")).all()

    assert event_location == "loc-lowercase-id"
    assert foreign_key_violations == []

    country_column = next(
        column
        for column in inspect(engine).get_columns("locations")
        if column["name"] == "country"
    )
    assert country_column["type"].length == 3


def test_downgrade_converts_stored_alpha3_country_codes_back_to_alpha2(tmp_path: Path) -> None:
    config = _config(tmp_path)
    command.upgrade(config, "0009_event_taxonomy_tree")
    engine = _engine(config)
    _seed(engine)
    command.upgrade(config, "0010_iso_alpha3_country_codes")

    command.downgrade(config, "0009_event_taxonomy_tree")

    assert _country_values(engine) == {
        "loc-lowercase-id": "ID",
        "loc-ye": "YE",
        "loc-null": None,
        "loc-unknown": "ZZ",
    }

    with engine.connect() as connection:
        event_location = connection.execute(
            text("SELECT location_id FROM event_locations WHERE event_id = 'event-1'")
        ).scalar_one()
        foreign_key_violations = connection.execute(text("PRAGMA foreign_key_check")).all()

    assert event_location == "loc-lowercase-id"
    assert foreign_key_violations == []

    country_column = next(
        column
        for column in inspect(engine).get_columns("locations")
        if column["name"] == "country"
    )
    assert country_column["type"].length == 2
