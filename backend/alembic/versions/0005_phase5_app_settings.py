"""Add the single-row app_settings table for runtime LM Studio configuration.

Revision ID: 0005_phase5_app_settings
Revises: 0004_coordinate_backfill
Create Date: 2026-07-14
"""

from alembic import op
import sqlalchemy as sa

revision = "0005_phase5_app_settings"
down_revision = "0004_coordinate_backfill"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "app_settings",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("lm_studio_base_url", sa.String(length=2048), nullable=True),
        sa.Column("lm_studio_model", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("app_settings")
