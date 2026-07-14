"""Apply the Document & Event Data Model decision.

Adds document dates and processing errors, evidence quotes on event sources,
actor roles and suggestion tracking, numeric location coordinates, and the
duplicate_flags table.

Revision ID: 0002_phase2_data_model
Revises: 0001_foundation
Create Date: 2026-07-14
"""

from alembic import op
import sqlalchemy as sa

revision = "0002_phase2_data_model"
down_revision = "0001_foundation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("documents") as batch_op:
        batch_op.add_column(
            sa.Column("document_date", sa.String(length=10), nullable=False, server_default="")
        )
        batch_op.add_column(sa.Column("processing_error", sa.Text(), nullable=True))
        batch_op.alter_column(
            "publication_date", existing_type=sa.String(length=10), nullable=True
        )

    with op.batch_alter_table("actors") as batch_op:
        batch_op.add_column(
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true())
        )

    with op.batch_alter_table("locations") as batch_op:
        batch_op.alter_column(
            "latitude",
            existing_type=sa.String(length=32),
            type_=sa.Numeric(9, 6),
            existing_nullable=True,
        )
        batch_op.alter_column(
            "longitude",
            existing_type=sa.String(length=32),
            type_=sa.Numeric(9, 6),
            existing_nullable=True,
        )

    with op.batch_alter_table("event_sources") as batch_op:
        batch_op.add_column(sa.Column("evidence_quote", sa.Text(), nullable=True))

    # No event_actors rows exist yet (Phase 2's document-processing endpoint is what
    # creates them), so the composite primary key can be changed by recreating the table.
    op.drop_table("event_actors")
    op.create_table(
        "event_actors",
        sa.Column("event_id", sa.String(length=36), primary_key=True),
        sa.Column("actor_id", sa.String(length=36), primary_key=True),
        sa.Column("role", sa.String(length=16), primary_key=True),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["actor_id"], ["actors.id"], ondelete="CASCADE"),
    )

    op.create_table(
        "duplicate_flags",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("draft_event_id", sa.String(length=36), nullable=False),
        sa.Column("matched_event_id", sa.String(length=36), nullable=False),
        sa.Column("matched_reason", sa.Text(), nullable=False),
        sa.Column("resolution", sa.String(length=32), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["draft_event_id"], ["events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["matched_event_id"], ["events.id"], ondelete="CASCADE"),
    )


def downgrade() -> None:
    op.drop_table("duplicate_flags")

    op.drop_table("event_actors")
    op.create_table(
        "event_actors",
        sa.Column("event_id", sa.String(length=36), primary_key=True),
        sa.Column("actor_id", sa.String(length=36), primary_key=True),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["actor_id"], ["actors.id"], ondelete="CASCADE"),
    )

    with op.batch_alter_table("event_sources") as batch_op:
        batch_op.drop_column("evidence_quote")

    with op.batch_alter_table("locations") as batch_op:
        batch_op.alter_column(
            "longitude", existing_type=sa.Numeric(9, 6), type_=sa.String(length=32)
        )
        batch_op.alter_column(
            "latitude", existing_type=sa.Numeric(9, 6), type_=sa.String(length=32)
        )

    with op.batch_alter_table("actors") as batch_op:
        batch_op.drop_column("is_active")

    with op.batch_alter_table("documents") as batch_op:
        batch_op.alter_column(
            "publication_date", existing_type=sa.String(length=10), nullable=False
        )
        batch_op.drop_column("processing_error")
        batch_op.drop_column("document_date")
