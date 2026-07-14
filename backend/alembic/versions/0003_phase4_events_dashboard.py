"""Add approval timestamps and deterministic location precision.

Revision ID: 0003_phase4_events_dashboard
Revises: 0002_phase2_data_model
Create Date: 2026-07-14
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_phase4_events_dashboard"
down_revision = "0002_phase2_data_model"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("events") as batch_op:
        batch_op.add_column(sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True))
    with op.batch_alter_table("locations") as batch_op:
        batch_op.add_column(sa.Column("coordinate_precision", sa.String(length=16), nullable=True))

    op.execute(
        "UPDATE events SET approved_at = updated_at "
        "WHERE review_status = 'approved' AND approved_at IS NULL"
    )


def downgrade() -> None:
    with op.batch_alter_table("locations") as batch_op:
        batch_op.drop_column("coordinate_precision")
    with op.batch_alter_table("events") as batch_op:
        batch_op.drop_column("approved_at")
