"""Add the persisted LM Studio extraction timeout.

Revision ID: 0006_lm_studio_timeout
Revises: 0005_phase5_app_settings
Create Date: 2026-07-15
"""

from alembic import op
import sqlalchemy as sa

revision = "0006_lm_studio_timeout"
down_revision = "0005_phase5_app_settings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("app_settings") as batch_op:
        batch_op.add_column(
            sa.Column(
                "lm_studio_extraction_timeout_seconds",
                sa.Integer(),
                nullable=False,
                server_default="300",
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("app_settings") as batch_op:
        batch_op.drop_column("lm_studio_extraction_timeout_seconds")
