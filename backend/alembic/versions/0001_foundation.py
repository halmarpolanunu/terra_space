"""Create Terra Space foundation tables.

Revision ID: 0001_foundation
Revises:
Create Date: 2026-07-13
"""

from alembic import op
import sqlalchemy as sa

revision = "0001_foundation"
down_revision = None
branch_labels = None
depends_on = None


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "documents",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("publication_date", sa.String(length=10), nullable=False),
        sa.Column("source_url", sa.String(length=2048), nullable=True),
        sa.Column("input_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("processing_status", sa.String(length=32), nullable=False),
        *timestamps(),
    )
    op.create_table(
        "event_types",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False, unique=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        *timestamps(),
    )
    op.create_table(
        "actors",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=500), nullable=False, unique=True),
        *timestamps(),
    )
    op.create_table(
        "locations",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("country", sa.String(length=2), nullable=True),
        sa.Column("admin1", sa.String(length=255), nullable=True),
        sa.Column("city_regency", sa.String(length=255), nullable=True),
        sa.Column("latitude", sa.String(length=32), nullable=True),
        sa.Column("longitude", sa.String(length=32), nullable=True),
        *timestamps(),
    )
    op.create_table(
        "sources",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("document_id", sa.String(length=36), nullable=True),
        sa.Column("reference_label", sa.String(length=500), nullable=False),
        *timestamps(),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="SET NULL"),
    )
    op.create_table(
        "attachments",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("document_id", sa.String(length=36), nullable=False),
        sa.Column("relative_path", sa.String(length=1024), nullable=False, unique=True),
        sa.Column("original_name", sa.String(length=512), nullable=False),
        sa.Column("media_type", sa.String(length=255), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("checksum", sa.String(length=128), nullable=False),
        *timestamps(),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
    )
    op.create_table(
        "events",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("event_type_id", sa.String(length=36), nullable=True),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("start_date", sa.String(length=10), nullable=True),
        sa.Column("end_date", sa.String(length=10), nullable=True),
        sa.Column("start_date_precision", sa.String(length=16), nullable=True),
        sa.Column("end_date_precision", sa.String(length=16), nullable=True),
        sa.Column("epistemic_status", sa.String(length=32), nullable=False),
        sa.Column("review_status", sa.String(length=32), nullable=False),
        *timestamps(),
        sa.ForeignKeyConstraint(["event_type_id"], ["event_types.id"], ondelete="SET NULL"),
    )
    op.create_table(
        "event_actors",
        sa.Column("event_id", sa.String(length=36), primary_key=True),
        sa.Column("actor_id", sa.String(length=36), primary_key=True),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["actor_id"], ["actors.id"], ondelete="CASCADE"),
    )
    op.create_table(
        "event_locations",
        sa.Column("event_id", sa.String(length=36), primary_key=True),
        sa.Column("location_id", sa.String(length=36), primary_key=True),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["location_id"], ["locations.id"], ondelete="CASCADE"),
    )
    op.create_table(
        "event_sources",
        sa.Column("event_id", sa.String(length=36), primary_key=True),
        sa.Column("source_id", sa.String(length=36), primary_key=True),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["source_id"], ["sources.id"], ondelete="RESTRICT"),
    )


def downgrade() -> None:
    op.drop_table("event_sources")
    op.drop_table("event_locations")
    op.drop_table("event_actors")
    op.drop_table("events")
    op.drop_table("attachments")
    op.drop_table("sources")
    op.drop_table("locations")
    op.drop_table("actors")
    op.drop_table("event_types")
    op.drop_table("documents")
