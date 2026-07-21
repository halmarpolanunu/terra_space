"""Add Event.candidate_index, correlating an event back to its Signal Parser candidate
so incomplete-extraction attributes can be looked up in the extraction log.

Revision ID: 0014_event_candidate_index
Revises: 0013_actor_aliases
Create Date: 2026-07-21
"""

from alembic import op
import sqlalchemy as sa

revision = "0014_event_candidate_index"
down_revision = "0013_actor_aliases"
branch_labels = None
depends_on = None


def _snapshot_event_dependents() -> bool:
    """Keep child rows safe while SQLite rebuilds the events table (same hazard as
    0008/0010/0012)."""

    connection = op.get_bind()
    if connection.dialect.name != "sqlite":
        return False

    statements = (
        "CREATE TEMPORARY TABLE _0014_event_actors AS SELECT * FROM event_actors",
        "CREATE TEMPORARY TABLE _0014_event_sources AS SELECT * FROM event_sources",
        "CREATE TEMPORARY TABLE _0014_event_locations AS SELECT * FROM event_locations",
        "CREATE TEMPORARY TABLE _0014_duplicate_flags AS SELECT * FROM duplicate_flags",
    )
    for statement in statements:
        connection.exec_driver_sql(statement)
    return True


def _restore_event_dependents() -> None:
    connection = op.get_bind()
    connection.exec_driver_sql(
        "INSERT OR REPLACE INTO event_actors (event_id, actor_id, role) "
        "SELECT event_id, actor_id, role FROM _0014_event_actors"
    )
    connection.exec_driver_sql(
        "INSERT OR REPLACE INTO event_sources (event_id, source_id, evidence_quote) "
        "SELECT event_id, source_id, evidence_quote FROM _0014_event_sources"
    )
    connection.exec_driver_sql(
        "INSERT OR REPLACE INTO event_locations (event_id, location_id) "
        "SELECT event_id, location_id FROM _0014_event_locations"
    )
    connection.exec_driver_sql(
        "INSERT OR REPLACE INTO duplicate_flags "
        "(id, draft_event_id, matched_event_id, matched_reason, resolution, resolved_at, "
        "created_at, updated_at) "
        "SELECT id, draft_event_id, matched_event_id, matched_reason, resolution, resolved_at, "
        "created_at, updated_at FROM _0014_duplicate_flags"
    )
    for table_name in (
        "_0014_event_actors",
        "_0014_event_sources",
        "_0014_event_locations",
        "_0014_duplicate_flags",
    ):
        connection.exec_driver_sql(f"DROP TABLE {table_name}")


def upgrade() -> None:
    has_snapshot = _snapshot_event_dependents()
    with op.batch_alter_table("events") as batch_op:
        batch_op.add_column(sa.Column("candidate_index", sa.Integer(), nullable=True))
    if has_snapshot:
        _restore_event_dependents()


def downgrade() -> None:
    has_snapshot = _snapshot_event_dependents()
    with op.batch_alter_table("events") as batch_op:
        batch_op.drop_column("candidate_index")
    if has_snapshot:
        _restore_event_dependents()
