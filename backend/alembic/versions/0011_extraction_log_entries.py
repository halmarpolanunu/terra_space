"""Add the per-stage extraction log table.

Revision ID: 0011_extraction_log_entries
Revises: 0010_iso_alpha3_country_codes
Create Date: 2026-07-20
"""

from alembic import op
import sqlalchemy as sa

revision = "0011_extraction_log_entries"
down_revision = "0010_iso_alpha3_country_codes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "extraction_log_entries",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "document_id",
            sa.String(length=36),
            sa.ForeignKey("documents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("candidate_index", sa.Integer(), nullable=True),
        sa.Column("stage", sa.String(length=32), nullable=False),
        sa.Column("outcome", sa.String(length=16), nullable=False),
        sa.Column("detail", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_extraction_log_entries_document_id",
        "extraction_log_entries",
        ["document_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_extraction_log_entries_document_id", table_name="extraction_log_entries")
    op.drop_table("extraction_log_entries")
