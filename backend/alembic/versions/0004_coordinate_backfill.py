"""Backfill coordinates for locations saved before Phase 4's write-time resolution.

Revision ID: 0004_coordinate_backfill
Revises: 0003_phase4_events_dashboard
Create Date: 2026-07-14
"""

from alembic import op
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Location
from app.services.locations import apply_coordinates

revision = "0004_coordinate_backfill"
down_revision = "0003_phase4_events_dashboard"
branch_labels = None
depends_on = None


def upgrade() -> None:
    session = Session(bind=op.get_bind())
    locations = list(
        session.execute(
            select(Location).where(Location.latitude.is_(None), Location.longitude.is_(None))
        ).scalars()
    )
    for location in locations:
        apply_coordinates(location)
    session.flush()


def downgrade() -> None:
    # Coordinates are deterministically derived from country/admin1/city_regency,
    # so there is nothing meaningful to reverse.
    pass
