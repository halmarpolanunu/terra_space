"""Add Event.extraction_incomplete, set when any staged classifier failed for that event.

Revision ID: 0012_event_extraction_incomplete
Revises: 0011_extraction_log_entries
Create Date: 2026-07-21
"""

from alembic import op
import sqlalchemy as sa

revision = "0012_event_extraction_incomplete"
down_revision = "0011_extraction_log_entries"
branch_labels = None
depends_on = None


def _snapshot_event_dependents() -> bool:
    """Keep child rows safe while SQLite rebuilds the events table.

    Dropping the old parent as part of Alembic's batch-copy process activates
    SQLite's ON DELETE CASCADE action when foreign-key enforcement is enabled,
    the same hazard already handled this way in 0008_single_source_event_date
    and 0010_iso_alpha3_country_codes.
    """

    connection = op.get_bind()
    if connection.dialect.name != "sqlite":
        return False

    statements = (
        "CREATE TEMPORARY TABLE _0012_event_actors AS SELECT * FROM event_actors",
        "CREATE TEMPORARY TABLE _0012_event_sources AS SELECT * FROM event_sources",
        "CREATE TEMPORARY TABLE _0012_event_locations AS SELECT * FROM event_locations",
        "CREATE TEMPORARY TABLE _0012_duplicate_flags AS SELECT * FROM duplicate_flags",
    )
    for statement in statements:
        connection.exec_driver_sql(statement)
    return True


def _restore_event_dependents() -> None:
    connection = op.get_bind()
    connection.exec_driver_sql(
        "INSERT OR REPLACE INTO event_actors (event_id, actor_id, role) "
        "SELECT event_id, actor_id, role FROM _0012_event_actors"
    )
    connection.exec_driver_sql(
        "INSERT OR REPLACE INTO event_sources (event_id, source_id, evidence_quote) "
        "SELECT event_id, source_id, evidence_quote FROM _0012_event_sources"
    )
    connection.exec_driver_sql(
        "INSERT OR REPLACE INTO event_locations (event_id, location_id) "
        "SELECT event_id, location_id FROM _0012_event_locations"
    )
    connection.exec_driver_sql(
        "INSERT OR REPLACE INTO duplicate_flags "
        "(id, draft_event_id, matched_event_id, matched_reason, resolution, resolved_at, "
        "created_at, updated_at) "
        "SELECT id, draft_event_id, matched_event_id, matched_reason, resolution, resolved_at, "
        "created_at, updated_at FROM _0012_duplicate_flags"
    )
    for table_name in (
        "_0012_event_actors",
        "_0012_event_sources",
        "_0012_event_locations",
        "_0012_duplicate_flags",
    ):
        connection.exec_driver_sql(f"DROP TABLE {table_name}")


def upgrade() -> None:
    has_snapshot = _snapshot_event_dependents()
    with op.batch_alter_table("events") as batch_op:
        batch_op.add_column(
            sa.Column(
                "extraction_incomplete",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            )
        )
    if has_snapshot:
        _restore_event_dependents()


def downgrade() -> None:
    has_snapshot = _snapshot_event_dependents()
    with op.batch_alter_table("events") as batch_op:
        batch_op.drop_column("extraction_incomplete")
    if has_snapshot:
        _restore_event_dependents()
