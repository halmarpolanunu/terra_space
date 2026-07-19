"""Use one publication date and one event date.

Revision ID: 0008_single_source_event_date
Revises: 0007_event_type_descriptions
Create Date: 2026-07-18
"""

from alembic import op
import sqlalchemy as sa


revision = "0008_single_source_event_date"
down_revision = "0007_event_type_descriptions"
branch_labels = None
depends_on = None


def _snapshot_sqlite_dependents() -> bool:
    """Keep child rows safe while SQLite rebuilds their parent tables.

    Dropping the old parent as part of Alembic's batch-copy process activates
    SQLite's ON DELETE actions when foreign-key enforcement is enabled.
    """

    connection = op.get_bind()
    if connection.dialect.name != "sqlite":
        return False

    statements = (
        "CREATE TEMPORARY TABLE _0008_source_document_links AS "
        "SELECT id AS source_id, document_id FROM sources WHERE document_id IS NOT NULL",
        "CREATE TEMPORARY TABLE _0008_attachments AS SELECT * FROM attachments",
        "CREATE TEMPORARY TABLE _0008_event_sources AS SELECT * FROM event_sources",
        "CREATE TEMPORARY TABLE _0008_event_actors AS SELECT * FROM event_actors",
        "CREATE TEMPORARY TABLE _0008_event_locations AS SELECT * FROM event_locations",
        "CREATE TEMPORARY TABLE _0008_duplicate_flags AS SELECT * FROM duplicate_flags",
    )
    for statement in statements:
        connection.exec_driver_sql(statement)
    return True


def _restore_sqlite_document_dependents() -> None:
    connection = op.get_bind()
    connection.exec_driver_sql(
        "UPDATE sources SET document_id = ("
        "SELECT saved.document_id FROM _0008_source_document_links AS saved "
        "WHERE saved.source_id = sources.id"
        ") WHERE id IN (SELECT source_id FROM _0008_source_document_links)"
    )
    connection.exec_driver_sql(
        "INSERT OR REPLACE INTO attachments "
        "(id, document_id, relative_path, original_name, media_type, size_bytes, checksum, "
        "created_at, updated_at) "
        "SELECT id, document_id, relative_path, original_name, media_type, size_bytes, "
        "checksum, created_at, updated_at FROM _0008_attachments"
    )


def _restore_sqlite_event_dependents() -> None:
    connection = op.get_bind()
    connection.exec_driver_sql(
        "INSERT OR REPLACE INTO event_sources (event_id, source_id, evidence_quote) "
        "SELECT event_id, source_id, evidence_quote FROM _0008_event_sources"
    )
    connection.exec_driver_sql(
        "INSERT OR REPLACE INTO event_actors (event_id, actor_id, role) "
        "SELECT event_id, actor_id, role FROM _0008_event_actors"
    )
    connection.exec_driver_sql(
        "INSERT OR REPLACE INTO event_locations (event_id, location_id) "
        "SELECT event_id, location_id FROM _0008_event_locations"
    )
    connection.exec_driver_sql(
        "INSERT OR REPLACE INTO duplicate_flags "
        "(id, draft_event_id, matched_event_id, matched_reason, resolution, resolved_at, "
        "created_at, updated_at) "
        "SELECT id, draft_event_id, matched_event_id, matched_reason, resolution, resolved_at, "
        "created_at, updated_at FROM _0008_duplicate_flags"
    )


def _drop_sqlite_snapshots() -> None:
    connection = op.get_bind()
    for table_name in (
        "_0008_duplicate_flags",
        "_0008_event_locations",
        "_0008_event_actors",
        "_0008_event_sources",
        "_0008_attachments",
        "_0008_source_document_links",
    ):
        connection.exec_driver_sql(f"DROP TABLE {table_name}")


def upgrade() -> None:
    has_sqlite_snapshots = _snapshot_sqlite_dependents()

    with op.batch_alter_table("events") as batch_op:
        batch_op.add_column(sa.Column("event_date", sa.String(length=10), nullable=True))
        batch_op.add_column(
            sa.Column("event_date_precision", sa.String(length=16), nullable=True)
        )

    op.execute(
        "UPDATE events SET event_date = start_date, "
        "event_date_precision = start_date_precision"
    )
    op.execute(
        "UPDATE documents SET publication_date = COALESCE(publication_date, document_date)"
    )

    with op.batch_alter_table("documents") as batch_op:
        batch_op.alter_column(
            "publication_date", existing_type=sa.String(length=10), nullable=False
        )
        batch_op.drop_column("document_date")

    with op.batch_alter_table("events") as batch_op:
        batch_op.drop_column("start_date")
        batch_op.drop_column("end_date")
        batch_op.drop_column("start_date_precision")
        batch_op.drop_column("end_date_precision")

    if has_sqlite_snapshots:
        _restore_sqlite_document_dependents()
        _restore_sqlite_event_dependents()
        _drop_sqlite_snapshots()


def downgrade() -> None:
    has_sqlite_snapshots = _snapshot_sqlite_dependents()

    with op.batch_alter_table("documents") as batch_op:
        batch_op.add_column(sa.Column("document_date", sa.String(length=10), nullable=True))

    op.execute("UPDATE documents SET document_date = publication_date")

    with op.batch_alter_table("documents") as batch_op:
        batch_op.alter_column(
            "document_date", existing_type=sa.String(length=10), nullable=False
        )
        batch_op.alter_column(
            "publication_date", existing_type=sa.String(length=10), nullable=True
        )

    with op.batch_alter_table("events") as batch_op:
        batch_op.add_column(sa.Column("start_date", sa.String(length=10), nullable=True))
        batch_op.add_column(sa.Column("end_date", sa.String(length=10), nullable=True))
        batch_op.add_column(
            sa.Column("start_date_precision", sa.String(length=16), nullable=True)
        )
        batch_op.add_column(
            sa.Column("end_date_precision", sa.String(length=16), nullable=True)
        )

    op.execute(
        "UPDATE events SET start_date = event_date, "
        "start_date_precision = event_date_precision"
    )

    with op.batch_alter_table("events") as batch_op:
        batch_op.drop_column("event_date")
        batch_op.drop_column("event_date_precision")

    if has_sqlite_snapshots:
        _restore_sqlite_document_dependents()
        _restore_sqlite_event_dependents()
        _drop_sqlite_snapshots()
