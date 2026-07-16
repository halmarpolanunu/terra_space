"""Add descriptions to event types.

Revision ID: 0007_event_type_descriptions
Revises: 0006_lm_studio_timeout
Create Date: 2026-07-16
"""

from alembic import op
import sqlalchemy as sa

revision = "0007_event_type_descriptions"
down_revision = "0006_lm_studio_timeout"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("event_types") as batch_op:
        batch_op.add_column(sa.Column("description", sa.String(length=1000), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("event_types") as batch_op:
        batch_op.drop_column("description")
