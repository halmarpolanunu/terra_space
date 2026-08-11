"""Backfill coordinates for locations saved before Phase 4's write-time resolution.

Revision ID: 0004_coordinate_backfill
Revises: 0003_phase4_events_dashboard
Create Date: 2026-07-14
"""

from alembic import op
import sqlalchemy as sa

# Deliberately not importing app.db.models here (see project-knowledge/plans/
# 2026-08-10-terra-space-supabase-transition.md, Task 2): this migration is a frozen historical
# step in the archived SQLite database's own migration chain, and the ORM models it originally
# imported now map onto the phase-prefixed PostgreSQL schema instead. Only `resolve_location` is
# still imported -- it is a pure lookup function (plain strings in, coordinates out) with no
# table-name coupling at all, so it stays safe to reuse. The row read/write below is raw SQL
# against this migration's own `locations` table, exactly as it existed at this point in history.
from app.services.locations import resolve_location

revision = "0004_coordinate_backfill"
down_revision = "0003_phase4_events_dashboard"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    rows = connection.execute(
        sa.text(
            "SELECT id, country, admin1, city_regency FROM locations "
            "WHERE latitude IS NULL AND longitude IS NULL"
        )
    ).all()
    for row in rows:
        resolved = resolve_location(row.country, row.admin1, row.city_regency)
        if resolved is None:
            continue
        connection.execute(
            sa.text(
                "UPDATE locations SET latitude = :latitude, longitude = :longitude, "
                "coordinate_precision = :precision WHERE id = :id"
            ),
            {
                "latitude": float(resolved.latitude),
                "longitude": float(resolved.longitude),
                "precision": resolved.precision,
                "id": row.id,
            },
        )


def downgrade() -> None:
    # Coordinates are deterministically derived from country/admin1/city_regency,
    # so there is nothing meaningful to reverse.
    pass
