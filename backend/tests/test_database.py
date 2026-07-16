from datetime import UTC, datetime
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session

from app.db.models import (
    Actor,
    Document,
    Event,
    EventActor,
    EventSource,
    EventType,
    Location,
    Source,
)
from app.db.session import configure_sqlite_connection


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
                == "0007_event_type_descriptions"
        )
    event_type_columns = {
        column["name"]: column for column in inspect(engine).get_columns("event_types")
    }
    assert event_type_columns["description"]["nullable"] is True


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


def test_foundation_schema_contains_all_required_tables(tmp_path: Path) -> None:
    engine = create_engine(f"sqlite:///{tmp_path / 'terra-space.db'}")
    configure_sqlite_connection(engine)

    from app.db.base import Base

    Base.metadata.create_all(engine)

    expected = {
        "documents",
        "attachments",
        "events",
        "event_types",
        "actors",
        "locations",
        "sources",
        "event_actors",
        "event_locations",
        "event_sources",
    }
    assert expected <= set(inspect(engine).get_table_names())

    with engine.connect() as connection:
        assert connection.execute(text("PRAGMA foreign_keys")).scalar_one() == 1


def test_approved_event_can_reference_multiple_actors_locations_and_sources(
    tmp_path: Path,
) -> None:
    engine = create_engine(f"sqlite:///{tmp_path / 'terra-space.db'}")
    configure_sqlite_connection(engine)
    from app.db.base import Base

    Base.metadata.create_all(engine)

    with Session(engine) as session:
        event_type = EventType(name="Protest", is_active=True)
        document = Document(
            title="Source document",
            content="Evidence",
            document_date="2026-07-13",
            input_date=datetime.now(UTC),
            processing_status="completed",
        )
        source = Source(document=document, reference_label="Source document")
        event = Event(
            title="Event",
            summary="Summary",
            epistemic_status="confirmed",
            review_status="approved",
            event_type=event_type,
        )
        event.event_actors.extend(
            [
                EventActor(actor=Actor(name="Actor A"), role="source"),
                EventActor(actor=Actor(name="Actor B"), role="target"),
            ]
        )
        event.locations.extend([Location(country="ID"), Location(country="MY")])
        event.event_sources.append(EventSource(source=source, evidence_quote="Evidence"))
        session.add(event)
        session.commit()

        assert len(event.event_actors) == 2
        assert len(event.locations) == 2
        assert len(event.event_sources) == 1


def test_deleting_source_document_does_not_delete_approved_event(tmp_path: Path) -> None:
    engine = create_engine(f"sqlite:///{tmp_path / 'terra-space.db'}")
    configure_sqlite_connection(engine)
    from app.db.base import Base

    Base.metadata.create_all(engine)
    with Session(engine) as session:
        document = Document(
            title="Source document",
            content="Evidence",
            document_date="2026-07-13",
            input_date=datetime.now(UTC),
            processing_status="completed",
        )
        source = Source(document=document, reference_label="Source document")
        event = Event(
            title="Event",
            summary="Summary",
            epistemic_status="confirmed",
            review_status="approved",
        )
        event.event_sources.append(EventSource(source=source, evidence_quote="Evidence"))
        session.add(event)
        session.commit()

        session.delete(document)
        session.commit()

        assert session.get(Event, event.id) is not None
