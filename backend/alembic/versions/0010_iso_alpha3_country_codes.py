"""Convert stored location country codes from ISO 3166-1 alpha-2 to alpha-3.

Revision ID: 0010_iso_alpha3_country_codes
Revises: 0009_event_taxonomy_tree
Create Date: 2026-07-20
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.orm import Session

from app.data.iso3166_alpha2_to_alpha3 import ALPHA2_TO_ALPHA3
from app.services.locations import backfill_missing_coordinates

revision = "0010_iso_alpha3_country_codes"
down_revision = "0009_event_taxonomy_tree"
branch_labels = None
depends_on = None

ALPHA3_TO_ALPHA2 = {alpha3: alpha2 for alpha2, alpha3 in ALPHA2_TO_ALPHA3.items()}


def _snapshot_event_locations() -> bool:
    """Keep event_locations rows safe while SQLite rebuilds the locations table.

    Dropping the old parent as part of Alembic's batch-copy process activates
    SQLite's ON DELETE CASCADE action when foreign-key enforcement is enabled,
    the same hazard already handled this way in 0008_single_source_event_date.
    """

    connection = op.get_bind()
    if connection.dialect.name != "sqlite":
        return False

    connection.exec_driver_sql(
        "CREATE TEMPORARY TABLE _0010_event_locations AS SELECT * FROM event_locations"
    )
    return True


def _restore_event_locations() -> None:
    connection = op.get_bind()
    connection.exec_driver_sql(
        "INSERT OR REPLACE INTO event_locations (event_id, location_id) "
        "SELECT event_id, location_id FROM _0010_event_locations"
    )
    connection.exec_driver_sql("DROP TABLE _0010_event_locations")


def _remap_country_codes(mapping: dict[str, str]) -> None:
    connection = op.get_bind()
    for source_code, target_code in mapping.items():
        connection.execute(
            sa.text(
                "UPDATE locations SET country = :target_code "
                "WHERE UPPER(TRIM(country)) = :source_code"
            ),
            {"target_code": target_code, "source_code": source_code},
        )


def upgrade() -> None:
    _remap_country_codes(ALPHA2_TO_ALPHA3)

    has_snapshot = _snapshot_event_locations()
    with op.batch_alter_table("locations") as batch_op:
        batch_op.alter_column(
            "country", existing_type=sa.String(length=2), type_=sa.String(length=3)
        )
    if has_snapshot:
        _restore_event_locations()

    # The gazetteer asset is keyed by alpha-3, so rows left unresolved only because
    # their country code was still alpha-2 can now be backfilled (mirrors the same
    # reasoning as 0004_coordinate_backfill).
    backfill_missing_coordinates(Session(bind=op.get_bind()))


def downgrade() -> None:
    has_snapshot = _snapshot_event_locations()
    with op.batch_alter_table("locations") as batch_op:
        batch_op.alter_column(
            "country", existing_type=sa.String(length=3), type_=sa.String(length=2)
        )
    if has_snapshot:
        _restore_event_locations()

    _remap_country_codes(ALPHA3_TO_ALPHA2)
