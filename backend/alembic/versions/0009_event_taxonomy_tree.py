"""Add the approved Event Taxonomy tree.

Revision ID: 0009_event_taxonomy_tree
Revises: 0008_single_source_event_date
Create Date: 2026-07-19
"""

from datetime import UTC, datetime
from uuid import NAMESPACE_URL, uuid5

from alembic import op
import sqlalchemy as sa


revision = "0009_event_taxonomy_tree"
down_revision = "0008_single_source_event_date"
branch_labels = None
depends_on = None


def _node_id(path: str) -> str:
    return str(uuid5(NAMESPACE_URL, f"terra-space:event-taxonomy:{path}"))


TREE = (
    ("Security & Conflict", "domain", None, None),
    ("Signalling & Posture", "category", "Security & Conflict", None),
    (
        "Security Signalling",
        "subcategory",
        "Security & Conflict/Signalling & Posture",
        None,
    ),
    (
        "Security Statement / Threat",
        "event_type",
        "Security & Conflict/Signalling & Posture/Security Signalling",
        "Security Statement / Threat",
    ),
    ("Military Readiness", "subcategory", "Security & Conflict/Signalling & Posture", None),
    (
        "Military Mobilization",
        "event_type",
        "Security & Conflict/Signalling & Posture/Military Readiness",
        "Military Mobilization",
    ),
    ("Military & Conflict Activity", "category", "Security & Conflict", None),
    ("Use of Force", "subcategory", "Security & Conflict/Military & Conflict Activity", None),
    (
        "Armed Operation / Strike",
        "event_type",
        "Security & Conflict/Military & Conflict Activity/Use of Force",
        "Armed Operation / Strike",
    ),
    (
        "Conflict Dynamics",
        "subcategory",
        "Security & Conflict/Military & Conflict Activity",
        None,
    ),
    (
        "Armed Conflict Escalation",
        "event_type",
        "Security & Conflict/Military & Conflict Activity/Conflict Dynamics",
        "Armed Conflict Escalation",
    ),
    ("Diplomacy", "domain", None, None),
    ("Diplomatic Engagement", "category", "Diplomacy", None),
    ("Diplomatic Communication", "subcategory", "Diplomacy/Diplomatic Engagement", None),
    (
        "Diplomatic Statement",
        "event_type",
        "Diplomacy/Diplomatic Engagement/Diplomatic Communication",
        "Diplomatic Statement",
    ),
    ("Dialogue & Facilitation", "subcategory", "Diplomacy/Diplomatic Engagement", None),
    (
        "Negotiation / Mediation",
        "event_type",
        "Diplomacy/Diplomatic Engagement/Dialogue & Facilitation",
        "Negotiation / Mediation",
    ),
    ("Agreements", "subcategory", "Diplomacy/Diplomatic Engagement", None),
    (
        "Diplomatic Agreement",
        "event_type",
        "Diplomacy/Diplomatic Engagement/Agreements",
        "Diplomatic Agreement",
    ),
    ("Diplomatic Pressure & Breakdown", "category", "Diplomacy", None),
    (
        "Coercion & Rupture",
        "subcategory",
        "Diplomacy/Diplomatic Pressure & Breakdown",
        None,
    ),
    (
        "Diplomatic Rupture / Coercion",
        "event_type",
        "Diplomacy/Diplomatic Pressure & Breakdown/Coercion & Rupture",
        "Diplomatic Rupture / Coercion",
    ),
    ("Economy & Energy", "domain", None, None),
    ("Policy & Restrictions", "category", "Economy & Energy", None),
    ("Policy Signalling", "subcategory", "Economy & Energy/Policy & Restrictions", None),
    (
        "Economic / Energy Policy Signal",
        "event_type",
        "Economy & Energy/Policy & Restrictions/Policy Signalling",
        "Economic / Energy Policy Signal",
    ),
    ("Sanctions & Trade", "subcategory", "Economy & Energy/Policy & Restrictions", None),
    (
        "Sanctions / Trade Restrictions",
        "event_type",
        "Economy & Energy/Policy & Restrictions/Sanctions & Trade",
        "Sanctions / Trade Restrictions",
    ),
    ("Cooperation & Systems", "category", "Economy & Energy", None),
    (
        "Economic & Energy Cooperation",
        "subcategory",
        "Economy & Energy/Cooperation & Systems",
        None,
    ),
    (
        "Economic / Energy Agreement",
        "event_type",
        "Economy & Energy/Cooperation & Systems/Economic & Energy Cooperation",
        "Economic / Energy Agreement",
    ),
    (
        "Supply & Infrastructure",
        "subcategory",
        "Economy & Energy/Cooperation & Systems",
        None,
    ),
    (
        "Supply / Energy Infrastructure Disruption",
        "event_type",
        "Economy & Energy/Cooperation & Systems/Supply & Infrastructure",
        "Supply / Energy Infrastructure Disruption",
    ),
)


EVENT_TYPE_DESCRIPTIONS = {
    "Security Statement / Threat": (
        "Official security statement, warning, threat, ultimatum, or declared security "
        "concern that has not yet become a material action."
    ),
    "Military Mobilization": (
        "Mobilization, deployment, exercises, alert posture, reinforcement, or other "
        "preparation by military or security forces."
    ),
    "Armed Operation / Strike": (
        "A reported security operation, strike, raid, interception, or use of armed force."
    ),
    "Armed Conflict Escalation": (
        "Sustained armed confrontation or a material escalation of violence between "
        "organized actors."
    ),
    "Diplomatic Statement": (
        "Official diplomatic communication, position, protest, recognition, condemnation, "
        "or policy announcement."
    ),
    "Negotiation / Mediation": (
        "Negotiation, dialogue, mediation, summit, ceasefire talk, or other effort to "
        "manage a dispute."
    ),
    "Diplomatic Agreement": (
        "Signed agreement, treaty, joint statement, formal cooperation, or concluded "
        "diplomatic arrangement."
    ),
    "Diplomatic Rupture / Coercion": (
        "Diplomatic rupture, expulsion, recall, downgrade, ultimatum, or coercive "
        "diplomatic measure."
    ),
    "Economic / Energy Policy Signal": (
        "Official economic or energy policy signal, planned measure, warning, forecast, "
        "or announced review not yet implemented."
    ),
    "Sanctions / Trade Restrictions": (
        "Implemented sanction, tariff, export control, embargo, import restriction, asset "
        "freeze, or comparable trade restriction."
    ),
    "Economic / Energy Agreement": (
        "Concluded trade, investment, supply, infrastructure, energy, or economic "
        "cooperation agreement."
    ),
    "Supply / Energy Infrastructure Disruption": (
        "Disruption to supply, shipping, trade flows, energy production, energy "
        "infrastructure, or strategic commodity access."
    ),
}


def _collect_taxonomy_migration_data(
    connection: sa.Connection,
) -> tuple[dict[str, str], list[str], str | None]:
    """Validate every prerequisite before this migration changes any data."""
    event_type_ids: dict[str, str] = {}
    missing_event_type_names: list[str] = []
    for name in EVENT_TYPE_DESCRIPTIONS:
        row = connection.execute(
            sa.text(
                "SELECT id, is_active, description FROM event_types WHERE name = :name"
            ),
            {"name": name},
        ).mappings().one_or_none()
        if row is None:
            missing_event_type_names.append(name)
            continue
        if not row["is_active"] or not str(row["description"] or "").strip():
            raise RuntimeError(
                f"Approved Event Type '{name}' must be active and have a description before "
                "the Event Taxonomy tree is created."
            )
        event_type_ids[name] = row["id"]

    airstrike_id = connection.execute(
        sa.text("SELECT id FROM event_types WHERE name = 'Airstrike'")
    ).scalar_one_or_none()
    if airstrike_id is None:
        return event_type_ids, missing_event_type_names, None

    non_draft_event_ids = connection.execute(
        sa.text(
            "SELECT id FROM events WHERE event_type_id = :event_type_id "
            "AND review_status != 'draft'"
        ),
        {"event_type_id": airstrike_id},
    ).scalars().all()
    if non_draft_event_ids:
        raise RuntimeError(
            "Cannot remove legacy Airstrike because it is used by non-draft event(s): "
            + ", ".join(non_draft_event_ids)
        )
    return event_type_ids, missing_event_type_names, airstrike_id


def _create_missing_approved_event_types(
    connection: sa.Connection,
    event_type_ids: dict[str, str],
    missing_event_type_names: list[str],
) -> None:
    now = datetime.now(UTC)
    for name in missing_event_type_names:
        event_type_id = str(uuid5(NAMESPACE_URL, f"terra-space:event-type:{name}"))
        connection.execute(
            sa.text(
                "INSERT INTO event_types "
                "(id, name, description, is_active, created_at, updated_at) VALUES "
                "(:id, :name, :description, 1, :created_at, :updated_at)"
            ),
            {
                "id": event_type_id,
                "name": name,
                "description": EVENT_TYPE_DESCRIPTIONS[name],
                "created_at": now,
                "updated_at": now,
            },
        )
        event_type_ids[name] = event_type_id


def _remove_legacy_airstrike(connection: sa.Connection, airstrike_id: str | None) -> None:
    if airstrike_id is None:
        return

    connection.execute(
        sa.text(
            "UPDATE events SET event_type_id = NULL "
            "WHERE event_type_id = :event_type_id AND review_status = 'draft'"
        ),
        {"event_type_id": airstrike_id},
    )
    connection.execute(
        sa.text("DELETE FROM event_types WHERE id = :event_type_id"),
        {"event_type_id": airstrike_id},
    )


def upgrade() -> None:
    connection = op.get_bind()
    event_type_ids, missing_event_type_names, airstrike_id = _collect_taxonomy_migration_data(
        connection
    )
    _create_missing_approved_event_types(
        connection, event_type_ids, missing_event_type_names
    )
    _remove_legacy_airstrike(connection, airstrike_id)

    op.create_table(
        "taxonomy_nodes",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("level", sa.String(length=16), nullable=False),
        sa.Column("parent_id", sa.String(length=36), nullable=True),
        sa.Column("event_type_id", sa.String(length=36), nullable=True, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["parent_id"], ["taxonomy_nodes.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["event_type_id"], ["event_types.id"], ondelete="SET NULL"),
    )

    now = datetime.now(UTC)
    node_ids: dict[str, str] = {}
    rows: list[dict[str, object]] = []
    for name, level, parent_path, event_type_name in TREE:
        path = name if parent_path is None else f"{parent_path}/{name}"
        node_ids[path] = _node_id(path)
        event_type_id = None if event_type_name is None else event_type_ids[event_type_name]
        rows.append(
            {
                "id": node_ids[path],
                "name": name,
                "level": level,
                "parent_id": None if parent_path is None else node_ids[parent_path],
                "event_type_id": event_type_id,
                "created_at": now,
                "updated_at": now,
            }
        )

    taxonomy_nodes = sa.table(
        "taxonomy_nodes",
        sa.column("id", sa.String),
        sa.column("name", sa.String),
        sa.column("level", sa.String),
        sa.column("parent_id", sa.String),
        sa.column("event_type_id", sa.String),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    op.bulk_insert(taxonomy_nodes, rows)


def downgrade() -> None:
    connection = op.get_bind()
    for level in ("event_type", "subcategory", "category", "domain"):
        connection.execute(
            sa.text("DELETE FROM taxonomy_nodes WHERE level = :level"), {"level": level}
        )
    op.drop_table("taxonomy_nodes")
