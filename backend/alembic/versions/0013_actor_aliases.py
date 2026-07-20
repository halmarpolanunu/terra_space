"""Add the actor_aliases table for owner-managed actor aliases.

Revision ID: 0013_actor_aliases
Revises: 0012_event_extraction_incomplete
Create Date: 2026-07-21
"""

from alembic import op
import sqlalchemy as sa

revision = "0013_actor_aliases"
down_revision = "0012_event_extraction_incomplete"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "actor_aliases",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "actor_id",
            sa.String(length=36),
            sa.ForeignKey("actors.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("alias", sa.String(length=500), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_actor_aliases_actor_id", "actor_aliases", ["actor_id"])


def downgrade() -> None:
    op.drop_index("ix_actor_aliases_actor_id", table_name="actor_aliases")
    op.drop_table("actor_aliases")
