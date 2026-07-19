import importlib.util
from pathlib import Path

from alembic import command
from alembic.config import Config
import pytest
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


def _prevent_legacy_airstrike_mutation(engine) -> None:  # type: ignore[no-untyped-def]
    with engine.begin() as connection:
        connection.execute(
            text(
                "CREATE TRIGGER reject_airstrike_event_mutation "
                "BEFORE UPDATE OF event_type_id ON events "
                "WHEN OLD.event_type_id = 'legacy-airstrike' "
                "BEGIN SELECT RAISE(ABORT, 'Airstrike must not be changed before approved "
                "Event Type validation'); END"
            )
        )
        connection.execute(
            text(
                "CREATE TRIGGER reject_airstrike_type_deletion "
                "BEFORE DELETE ON event_types "
                "WHEN OLD.id = 'legacy-airstrike' "
                "BEGIN SELECT RAISE(ABORT, 'Airstrike must not be deleted before approved "
                "Event Type validation'); END"
            )
        )


def _event_type_rows(engine) -> list[tuple[str, str, str | None, int]]:  # type: ignore[no-untyped-def]
    with engine.connect() as connection:
        return connection.execute(
            text(
                "SELECT id, name, description, is_active FROM event_types "
                "ORDER BY id"
            )
        ).tuples().all()


def _migration_0009_module():  # type: ignore[no-untyped-def]
    migration_path = Path(__file__).resolve().parents[1] / "alembic" / "versions" / "0009_event_taxonomy_tree.py"
    spec = importlib.util.spec_from_file_location("event_taxonomy_migration", migration_path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _seed_linked_graph(engine) -> None:  # type: ignore[no-untyped-def]
    with engine.begin() as connection:
        assert connection.execute(text("PRAGMA foreign_keys")).scalar_one() == 1
        connection.execute(
            text(
                "INSERT INTO documents "
                "(id, title, content, document_date, publication_date, input_date, "
                "processing_status, created_at, updated_at) VALUES "
                "('linked-document', 'Linked document', 'Linked content', '2026-07-09', "
                "'2026-07-10', CURRENT_TIMESTAMP, 'completed', CURRENT_TIMESTAMP, "
                "CURRENT_TIMESTAMP)"
            )
        )
        connection.execute(
            text(
                "INSERT INTO attachments "
                "(id, document_id, relative_path, original_name, media_type, size_bytes, "
                "checksum, created_at, updated_at) VALUES "
                "('linked-attachment', 'linked-document', 'linked/file.png', 'file.png', "
                "'image/png', 321, 'checksum-321', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            )
        )
        connection.execute(
            text(
                "INSERT INTO sources "
                "(id, document_id, reference_label, created_at, updated_at) VALUES "
                "('linked-source', 'linked-document', 'Linked source', CURRENT_TIMESTAMP, "
                "CURRENT_TIMESTAMP)"
            )
        )
        connection.execute(
            text(
                "INSERT INTO events "
                "(id, title, summary, start_date, start_date_precision, epistemic_status, "
                "review_status, created_at, updated_at) VALUES "
                "('linked-event', 'Linked event', 'Linked summary', '2026-07-08', 'exact', "
                "'confirmed', 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), "
                "('matched-event', 'Matched event', 'Matched summary', '2026-07-07', 'exact', "
                "'confirmed', 'approved', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            )
        )
        connection.execute(
            text(
                "INSERT INTO actors "
                "(id, name, is_active, created_at, updated_at) VALUES "
                "('linked-actor', 'Linked actor', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            )
        )
        connection.execute(
            text(
                "INSERT INTO locations "
                "(id, country, admin1, city_regency, latitude, longitude, created_at, "
                "updated_at) VALUES "
                "('linked-location', 'ID', 'Jakarta', 'Jakarta', -6.200000, 106.816666, "
                "CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            )
        )
        connection.execute(
            text(
                "INSERT INTO event_sources (event_id, source_id, evidence_quote) VALUES "
                "('linked-event', 'linked-source', 'Linked evidence')"
            )
        )
        connection.execute(
            text(
                "INSERT INTO event_actors (event_id, actor_id, role) VALUES "
                "('linked-event', 'linked-actor', 'source')"
            )
        )
        connection.execute(
            text(
                "INSERT INTO event_locations (event_id, location_id) VALUES "
                "('linked-event', 'linked-location')"
            )
        )
        connection.execute(
            text(
                "INSERT INTO duplicate_flags "
                "(id, draft_event_id, matched_event_id, matched_reason, resolution, "
                "created_at, updated_at) VALUES "
                "('linked-duplicate', 'linked-event', 'matched-event', 'same actor', "
                "'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            )
        )


def _assert_linked_graph_is_unchanged(engine) -> None:  # type: ignore[no-untyped-def]
    with engine.connect() as connection:
        assert connection.execute(text("PRAGMA foreign_keys")).scalar_one() == 1
        source = connection.execute(
            text(
                "SELECT document_id, reference_label FROM sources "
                "WHERE id = 'linked-source'"
            )
        ).mappings().one()
        attachment = connection.execute(
            text(
                "SELECT document_id, relative_path, original_name, media_type, size_bytes, "
                "checksum FROM attachments WHERE id = 'linked-attachment'"
            )
        ).mappings().one()
        event_source = connection.execute(
            text(
                "SELECT source_id, evidence_quote FROM event_sources "
                "WHERE event_id = 'linked-event'"
            )
        ).mappings().one()
        event_actor = connection.execute(
            text(
                "SELECT actor_id, role FROM event_actors WHERE event_id = 'linked-event'"
            )
        ).mappings().one()
        event_location = connection.execute(
            text(
                "SELECT location_id FROM event_locations WHERE event_id = 'linked-event'"
            )
        ).mappings().one()
        duplicate_flag = connection.execute(
            text(
                "SELECT draft_event_id, matched_event_id, matched_reason, resolution "
                "FROM duplicate_flags WHERE id = 'linked-duplicate'"
            )
        ).mappings().one()
        foreign_key_violations = connection.execute(
            text("PRAGMA foreign_key_check")
        ).all()

    assert dict(source) == {
        "document_id": "linked-document",
        "reference_label": "Linked source",
    }
    assert dict(attachment) == {
        "document_id": "linked-document",
        "relative_path": "linked/file.png",
        "original_name": "file.png",
        "media_type": "image/png",
        "size_bytes": 321,
        "checksum": "checksum-321",
    }
    assert dict(event_source) == {
        "source_id": "linked-source",
        "evidence_quote": "Linked evidence",
    }
    assert dict(event_actor) == {"actor_id": "linked-actor", "role": "source"}
    assert dict(event_location) == {"location_id": "linked-location"}
    assert dict(duplicate_flag) == {
        "draft_event_id": "linked-event",
        "matched_event_id": "matched-event",
        "matched_reason": "same actor",
        "resolution": "pending",
    }
    assert foreign_key_violations == []


def test_migration_preserves_dates_and_linked_rows_with_foreign_keys_enabled(
    tmp_path: Path,
) -> None:
    config = _config(tmp_path)
    command.upgrade(config, "0007_event_type_descriptions")
    engine = _engine(config)

    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO documents "
                "(id, title, content, document_date, publication_date, input_date, "
                "processing_status, created_at, updated_at) "
                "VALUES "
                "('both-dates', 'Both dates', 'Text', '2026-07-10', '2026-07-12', "
                "CURRENT_TIMESTAMP, 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), "
                "('document-date-only', 'Document date only', 'Text', '2026-07-10', NULL, "
                "CURRENT_TIMESTAMP, 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            )
        )
        connection.execute(
            text(
                "INSERT INTO events "
                "(id, title, summary, start_date, start_date_precision, epistemic_status, "
                "review_status, created_at, updated_at) "
                "VALUES ('started-event', 'Started event', 'Summary', '2026-07-10', 'exact', "
                "'confirmed', 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            )
        )
    _seed_linked_graph(engine)
    command.upgrade(config, "0008_single_source_event_date")

    with engine.connect() as connection:
        document_with_both = connection.execute(
            text("SELECT publication_date FROM documents WHERE id = 'both-dates'")
        ).mappings().one()
        document_with_only_document_date = connection.execute(
            text("SELECT publication_date FROM documents WHERE id = 'document-date-only'")
        ).mappings().one()
        started_event = connection.execute(
            text(
                "SELECT event_date, event_date_precision FROM events "
                "WHERE id = 'started-event'"
            )
        ).mappings().one()

    assert document_with_both["publication_date"] == "2026-07-12"
    assert document_with_only_document_date["publication_date"] == "2026-07-10"
    assert started_event["event_date"] == "2026-07-10"
    assert started_event["event_date_precision"] == "exact"

    document_columns = {column["name"] for column in inspect(engine).get_columns("documents")}
    event_columns = {column["name"] for column in inspect(engine).get_columns("events")}
    assert "document_date" not in document_columns
    assert {"event_date", "event_date_precision"} <= event_columns
    assert not {"start_date", "end_date", "start_date_precision", "end_date_precision"} & event_columns
    _assert_linked_graph_is_unchanged(engine)


def test_migration_downgrade_restores_legacy_date_columns(tmp_path: Path) -> None:
    config = _config(tmp_path)
    command.upgrade(config, "0007_event_type_descriptions")
    engine = _engine(config)

    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO documents "
                "(id, title, content, document_date, publication_date, input_date, "
                "processing_status, created_at, updated_at) "
                "VALUES ('legacy-document', 'Legacy document', 'Text', '2026-07-10', "
                "'2026-07-12', CURRENT_TIMESTAMP, 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            )
        )
        connection.execute(
            text(
                "INSERT INTO events "
                "(id, title, summary, start_date, start_date_precision, epistemic_status, "
                "review_status, created_at, updated_at) "
                "VALUES ('legacy-event', 'Legacy event', 'Summary', '2026-07-10', 'exact', "
                "'confirmed', 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            )
        )
    _seed_linked_graph(engine)
    command.upgrade(config, "0008_single_source_event_date")
    _assert_linked_graph_is_unchanged(engine)
    command.downgrade(config, "0007_event_type_descriptions")

    document_columns = {column["name"] for column in inspect(engine).get_columns("documents")}
    event_columns = {column["name"] for column in inspect(engine).get_columns("events")}
    assert "document_date" in document_columns
    assert {"start_date", "end_date", "start_date_precision", "end_date_precision"} <= event_columns

    with engine.connect() as connection:
        document = connection.execute(
            text("SELECT document_date FROM documents WHERE id = 'legacy-document'")
        ).mappings().one()
        event = connection.execute(
            text(
                "SELECT start_date, start_date_precision, end_date, end_date_precision "
                "FROM events WHERE id = 'legacy-event'"
            )
        ).mappings().one()

    assert document["document_date"] == "2026-07-12"
    assert event["start_date"] == "2026-07-10"
    assert event["start_date_precision"] == "exact"
    assert event["end_date"] is None
    assert event["end_date_precision"] is None
    _assert_linked_graph_is_unchanged(engine)


def test_0009_creates_tree_and_untypes_legacy_airstrike(tmp_path: Path) -> None:
    config = _config(tmp_path)
    command.upgrade(config, "0008_single_source_event_date")
    engine = _engine(config)

    approved_type_names = (
        "Security Statement / Threat",
        "Military Mobilization",
        "Armed Operation / Strike",
        "Armed Conflict Escalation",
        "Diplomatic Statement",
        "Negotiation / Mediation",
        "Diplomatic Agreement",
        "Diplomatic Rupture / Coercion",
        "Economic / Energy Policy Signal",
        "Sanctions / Trade Restrictions",
        "Economic / Energy Agreement",
        "Supply / Energy Infrastructure Disruption",
    )

    with engine.begin() as connection:
        for index, name in enumerate(approved_type_names):
            connection.execute(
                text(
                    "INSERT INTO event_types "
                    "(id, name, description, is_active, created_at, updated_at) VALUES "
                    "(:id, :name, :description, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
                ),
                {"id": f"approved-type-{index}", "name": name, "description": name},
            )
        connection.execute(
            text(
                "INSERT INTO event_types "
                "(id, name, description, is_active, created_at, updated_at) VALUES "
                "('legacy-airstrike', 'Airstrike', 'Legacy type', 1, CURRENT_TIMESTAMP, "
                "CURRENT_TIMESTAMP)"
            )
        )
        connection.execute(
            text(
                "INSERT INTO events "
                "(id, event_type_id, title, summary, epistemic_status, review_status, "
                "created_at, updated_at) VALUES "
                "('airstrike-draft', 'legacy-airstrike', 'Legacy draft', 'Summary', "
                "'confirmed', 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            )
        )

    command.upgrade(config, "0009_event_taxonomy_tree")

    with engine.connect() as connection:
        domains = connection.execute(
            text("SELECT name FROM taxonomy_nodes WHERE level = 'domain' ORDER BY name")
        ).scalars().all()
        leaves = connection.execute(
            text("SELECT event_type_id FROM taxonomy_nodes WHERE level = 'event_type'")
        ).scalars().all()
        airstrike = connection.execute(
            text("SELECT id FROM event_types WHERE name = 'Airstrike'")
        ).scalar_one_or_none()
        draft_type_id = connection.execute(
            text("SELECT event_type_id FROM events WHERE id = 'airstrike-draft'")
        ).scalar_one()
        foreign_key_violations = connection.execute(text("PRAGMA foreign_key_check")).all()
        leaf_paths = connection.execute(
            text(
                "SELECT leaf.name AS leaf_name, event_types.name AS event_type_name, "
                "domain.name AS domain_name, category.name AS category_name, "
                "subcategory.name AS subcategory_name "
                "FROM taxonomy_nodes AS leaf "
                "JOIN taxonomy_nodes AS subcategory ON subcategory.id = leaf.parent_id "
                "JOIN taxonomy_nodes AS category ON category.id = subcategory.parent_id "
                "JOIN taxonomy_nodes AS domain ON domain.id = category.parent_id "
                "JOIN event_types ON event_types.id = leaf.event_type_id "
                "WHERE leaf.level = 'event_type'"
            )
        ).mappings().all()

    assert domains == ["Diplomacy", "Economy & Energy", "Security & Conflict"]
    assert len(leaves) == 12
    assert all(leaves)
    assert airstrike is None
    assert draft_type_id is None
    assert foreign_key_violations == []
    assert {
        row["leaf_name"]: (
            row["domain_name"],
            row["category_name"],
            row["subcategory_name"],
            row["event_type_name"],
        )
        for row in leaf_paths
    } == {
        "Security Statement / Threat": (
            "Security & Conflict",
            "Signalling & Posture",
            "Security Signalling",
            "Security Statement / Threat",
        ),
        "Military Mobilization": (
            "Security & Conflict",
            "Signalling & Posture",
            "Military Readiness",
            "Military Mobilization",
        ),
        "Armed Operation / Strike": (
            "Security & Conflict",
            "Military & Conflict Activity",
            "Use of Force",
            "Armed Operation / Strike",
        ),
        "Armed Conflict Escalation": (
            "Security & Conflict",
            "Military & Conflict Activity",
            "Conflict Dynamics",
            "Armed Conflict Escalation",
        ),
        "Diplomatic Statement": (
            "Diplomacy",
            "Diplomatic Engagement",
            "Diplomatic Communication",
            "Diplomatic Statement",
        ),
        "Negotiation / Mediation": (
            "Diplomacy",
            "Diplomatic Engagement",
            "Dialogue & Facilitation",
            "Negotiation / Mediation",
        ),
        "Diplomatic Agreement": (
            "Diplomacy",
            "Diplomatic Engagement",
            "Agreements",
            "Diplomatic Agreement",
        ),
        "Diplomatic Rupture / Coercion": (
            "Diplomacy",
            "Diplomatic Pressure & Breakdown",
            "Coercion & Rupture",
            "Diplomatic Rupture / Coercion",
        ),
        "Economic / Energy Policy Signal": (
            "Economy & Energy",
            "Policy & Restrictions",
            "Policy Signalling",
            "Economic / Energy Policy Signal",
        ),
        "Sanctions / Trade Restrictions": (
            "Economy & Energy",
            "Policy & Restrictions",
            "Sanctions & Trade",
            "Sanctions / Trade Restrictions",
        ),
        "Economic / Energy Agreement": (
            "Economy & Energy",
            "Cooperation & Systems",
            "Economic & Energy Cooperation",
            "Economic / Energy Agreement",
        ),
        "Supply / Energy Infrastructure Disruption": (
            "Economy & Energy",
            "Cooperation & Systems",
            "Supply & Infrastructure",
            "Supply / Energy Infrastructure Disruption",
        ),
    }

    command.downgrade(config, "0008_single_source_event_date")
    with engine.connect() as connection:
        assert "taxonomy_nodes" not in inspect(engine).get_table_names()
        assert connection.execute(
            text("SELECT event_type_id FROM events WHERE id = 'airstrike-draft'")
        ).scalar_one() is None
        assert connection.execute(
            text("SELECT COUNT(*) FROM event_types WHERE name != 'Airstrike'")
        ).scalar_one() == 12


def test_0009_allows_an_owner_database_without_legacy_airstrike(tmp_path: Path) -> None:
    config = _config(tmp_path)
    command.upgrade(config, "0008_single_source_event_date")
    engine = _engine(config)

    command.upgrade(config, "0009_event_taxonomy_tree")

    with engine.connect() as connection:
        node_count = connection.execute(text("SELECT COUNT(*) FROM taxonomy_nodes")).scalar_one()
        linked_active_leaves = connection.execute(
            text(
                "SELECT COUNT(*) FROM taxonomy_nodes AS nodes "
                "JOIN event_types ON event_types.id = nodes.event_type_id "
                "WHERE nodes.level = 'event_type' AND event_types.is_active = 1 "
                "AND event_types.description IS NOT NULL AND event_types.description != ''"
            )
        ).scalar_one()
        foreign_key_violations = connection.execute(text("PRAGMA foreign_key_check")).all()

    assert node_count == 33
    assert linked_active_leaves == 12
    assert foreign_key_violations == []


def test_0009_refuses_to_delete_airstrike_used_by_non_draft_event(tmp_path: Path) -> None:
    config = _config(tmp_path)
    command.upgrade(config, "0008_single_source_event_date")
    engine = _engine(config)

    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO event_types "
                "(id, name, description, is_active, created_at, updated_at) VALUES "
                "('legacy-airstrike', 'Airstrike', 'Legacy type', 1, CURRENT_TIMESTAMP, "
                "CURRENT_TIMESTAMP)"
            )
        )
        connection.execute(
            text(
                "INSERT INTO events "
                "(id, event_type_id, title, summary, epistemic_status, review_status, "
                "created_at, updated_at) VALUES "
                "('airstrike-approved', 'legacy-airstrike', 'Approved event', 'Summary', "
                "'confirmed', 'approved', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            )
        )

    event_types_before = _event_type_rows(engine)
    with pytest.raises(RuntimeError, match="non-draft event"):
        command.upgrade(config, "0009_event_taxonomy_tree")

    assert _event_type_rows(engine) == event_types_before
    assert "taxonomy_nodes" not in inspect(engine).get_table_names()
    with engine.connect() as connection:
        assert connection.execute(
            text("SELECT event_type_id FROM events WHERE id = 'airstrike-approved'")
        ).scalar_one() == "legacy-airstrike"


def test_0009_validation_collection_does_not_write_before_rejecting_an_inactive_type(
    tmp_path: Path,
) -> None:
    config = _config(tmp_path)
    command.upgrade(config, "0008_single_source_event_date")
    engine = _engine(config)
    migration = _migration_0009_module()

    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO event_types "
                "(id, name, description, is_active, created_at, updated_at) VALUES "
                "('inactive-approved-type', 'Diplomatic Statement', 'A valid description', 0, "
                "CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            )
        )
        connection.execute(
            text(
                "INSERT INTO event_types "
                "(id, name, description, is_active, created_at, updated_at) VALUES "
                "('legacy-airstrike', 'Airstrike', 'Legacy type', 1, CURRENT_TIMESTAMP, "
                "CURRENT_TIMESTAMP)"
            )
        )

    event_types_before = _event_type_rows(engine)
    with engine.connect() as connection:
        with pytest.raises(RuntimeError, match="Diplomatic Statement.*must be active"):
            migration._collect_taxonomy_migration_data(connection)

    assert _event_type_rows(engine) == event_types_before
    assert "taxonomy_nodes" not in inspect(engine).get_table_names()


def test_0009_validation_collection_does_not_write_before_rejecting_non_draft_airstrike(
    tmp_path: Path,
) -> None:
    config = _config(tmp_path)
    command.upgrade(config, "0008_single_source_event_date")
    engine = _engine(config)
    migration = _migration_0009_module()

    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO event_types "
                "(id, name, description, is_active, created_at, updated_at) VALUES "
                "('legacy-airstrike', 'Airstrike', 'Legacy type', 1, CURRENT_TIMESTAMP, "
                "CURRENT_TIMESTAMP)"
            )
        )
        connection.execute(
            text(
                "INSERT INTO events "
                "(id, event_type_id, title, summary, epistemic_status, review_status, "
                "created_at, updated_at) VALUES "
                "('airstrike-approved', 'legacy-airstrike', 'Approved event', 'Summary', "
                "'confirmed', 'approved', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            )
        )

    event_types_before = _event_type_rows(engine)
    with engine.connect() as connection:
        with pytest.raises(RuntimeError, match="non-draft event"):
            migration._collect_taxonomy_migration_data(connection)

    assert _event_type_rows(engine) == event_types_before
    assert "taxonomy_nodes" not in inspect(engine).get_table_names()
    with engine.connect() as connection:
        assert connection.execute(
            text("SELECT event_type_id FROM events WHERE id = 'airstrike-approved'")
        ).scalar_one() == "legacy-airstrike"


def test_0009_refuses_inactive_approved_type_before_mutating_airstrike(tmp_path: Path) -> None:
    config = _config(tmp_path)
    command.upgrade(config, "0008_single_source_event_date")
    engine = _engine(config)
    _prevent_legacy_airstrike_mutation(engine)

    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO event_types "
                "(id, name, description, is_active, created_at, updated_at) VALUES "
                "('inactive-approved-type', 'Diplomatic Statement', 'A valid description', 0, "
                "CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            )
        )
        connection.execute(
            text(
                "INSERT INTO event_types "
                "(id, name, description, is_active, created_at, updated_at) VALUES "
                "('legacy-airstrike', 'Airstrike', 'Legacy type', 1, CURRENT_TIMESTAMP, "
                "CURRENT_TIMESTAMP)"
            )
        )
        connection.execute(
            text(
                "INSERT INTO events "
                "(id, event_type_id, title, summary, epistemic_status, review_status, "
                "created_at, updated_at) VALUES "
                "('airstrike-draft', 'legacy-airstrike', 'Legacy draft', 'Summary', "
                "'confirmed', 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            )
        )

    event_types_before = _event_type_rows(engine)
    with pytest.raises(RuntimeError, match="Diplomatic Statement.*must be active"):
        command.upgrade(config, "0009_event_taxonomy_tree")

    with engine.connect() as connection:
        assert "taxonomy_nodes" not in inspect(engine).get_table_names()
        assert connection.execute(
            text("SELECT id FROM event_types WHERE name = 'Airstrike'")
        ).scalar_one() == "legacy-airstrike"
        assert connection.execute(
            text("SELECT event_type_id FROM events WHERE id = 'airstrike-draft'")
        ).scalar_one() == "legacy-airstrike"
    assert _event_type_rows(engine) == event_types_before


def test_0009_refuses_blank_approved_type_description_before_mutating_airstrike(
    tmp_path: Path,
) -> None:
    config = _config(tmp_path)
    command.upgrade(config, "0008_single_source_event_date")
    engine = _engine(config)
    _prevent_legacy_airstrike_mutation(engine)

    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO event_types "
                "(id, name, description, is_active, created_at, updated_at) VALUES "
                "('blank-approved-type', 'Diplomatic Statement', '   ', 1, "
                "CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            )
        )
        connection.execute(
            text(
                "INSERT INTO event_types "
                "(id, name, description, is_active, created_at, updated_at) VALUES "
                "('legacy-airstrike', 'Airstrike', 'Legacy type', 1, CURRENT_TIMESTAMP, "
                "CURRENT_TIMESTAMP)"
            )
        )
        connection.execute(
            text(
                "INSERT INTO events "
                "(id, event_type_id, title, summary, epistemic_status, review_status, "
                "created_at, updated_at) VALUES "
                "('airstrike-draft', 'legacy-airstrike', 'Legacy draft', 'Summary', "
                "'confirmed', 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            )
        )

    event_types_before = _event_type_rows(engine)
    with pytest.raises(RuntimeError, match="Diplomatic Statement.*have a description"):
        command.upgrade(config, "0009_event_taxonomy_tree")

    with engine.connect() as connection:
        assert "taxonomy_nodes" not in inspect(engine).get_table_names()
        assert connection.execute(
            text("SELECT id FROM event_types WHERE name = 'Airstrike'")
        ).scalar_one() == "legacy-airstrike"
        assert connection.execute(
            text("SELECT event_type_id FROM events WHERE id = 'airstrike-draft'")
        ).scalar_one() == "legacy-airstrike"
    assert _event_type_rows(engine) == event_types_before
