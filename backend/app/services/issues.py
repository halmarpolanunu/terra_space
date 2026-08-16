"""GET-only queries for the parallel Issue-first analytical views.

All functions use the read-only Supabase engine.  The database views already hide every failed,
unvalidated, or superseded pipeline run; this module adds no fallback to the current event-first
tables and contains no write statement.
"""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.schemas.issues import (
    ActorEndpointRead,
    ActorLocationRead,
    ActorRelationshipRead,
    IssueDetail,
    IssueEventDetail,
    IssueEventRead,
    IssueListItem,
)

_ISSUE_COLUMNS = """
    id, source_id, source_title, label, summary, evidence_quote, processed_at, created_at
"""

_EVENT_COLUMNS = """
    id, title, evidence_quote, created_at
"""


def list_issues(engine: Engine) -> list[IssueListItem]:
    """Return only the current valid Issue for each source, newest processing run first."""

    with engine.connect() as conn:
        rows = conn.execute(
            text(
                f"""
                select {_ISSUE_COLUMNS}
                from public.terra_space_issue_v2_valid_issue_list_items
                order by processed_at desc, created_at desc, id desc
                """
            )
        ).mappings()
        return [IssueListItem.model_validate(dict(row)) for row in rows]


def get_issue(engine: Engine, issue_id: str) -> IssueDetail | None:
    """One current valid Issue and only the current valid events directly beneath it."""

    with engine.connect() as conn:
        issue_row = conn.execute(
            text(
                f"""
                select {_ISSUE_COLUMNS}
                from public.terra_space_issue_v2_valid_issue_list_items
                where id = :issue_id
                """
            ),
            {"issue_id": issue_id},
        ).mappings().first()
        if issue_row is None:
            return None
        event_rows = conn.execute(
            text(
                f"""
                select {_EVENT_COLUMNS}
                from public.terra_space_issue_v2_valid_events
                where issue_id = :issue_id
                order by created_at asc, id asc
                """
            ),
            {"issue_id": issue_id},
        ).mappings()
        return IssueDetail(
            **dict(issue_row),
            events=[IssueEventRead.model_validate(dict(row)) for row in event_rows],
        )


def get_issue_event(engine: Engine, issue_id: str, event_id: str) -> IssueEventDetail | None:
    """One valid event under its Issue, including only complete validated relationships."""

    with engine.connect() as conn:
        event_row = conn.execute(
            text(
                f"""
                select {_EVENT_COLUMNS}
                from public.terra_space_issue_v2_valid_events
                where issue_id = :issue_id and id = :event_id
                """
            ),
            {"issue_id": issue_id, "event_id": event_id},
        ).mappings().first()
        if event_row is None:
            return None
        relationship_rows = conn.execute(
            text(
                """
                select
                    id, evidence_quote,
                    source_actor_name, source_evidence_quote,
                    source_location_id, source_location_label, source_latitude,
                    source_longitude, source_location_evidence_quote,
                    target_actor_name, target_evidence_quote,
                    target_location_id, target_location_label, target_latitude,
                    target_longitude, target_location_evidence_quote
                from public.terra_space_issue_v2_valid_relationships
                where issue_id = :issue_id and event_id = :event_id
                order by created_at asc, id asc
                """
            ),
            {"issue_id": issue_id, "event_id": event_id},
        ).mappings()
        return IssueEventDetail(
            **dict(event_row),
            relationships=[_to_relationship_read(dict(row)) for row in relationship_rows],
        )


def _to_relationship_read(row: dict) -> ActorRelationshipRead:
    return ActorRelationshipRead(
        id=row["id"],
        evidence_quote=row["evidence_quote"],
        source=ActorEndpointRead(
            role="source",
            actor_name=row["source_actor_name"],
            evidence_quote=row["source_evidence_quote"],
            location=ActorLocationRead(
                id=row["source_location_id"],
                label=row["source_location_label"],
                latitude=row["source_latitude"],
                longitude=row["source_longitude"],
                evidence_quote=row["source_location_evidence_quote"],
            ),
        ),
        target=ActorEndpointRead(
            role="target",
            actor_name=row["target_actor_name"],
            evidence_quote=row["target_evidence_quote"],
            location=ActorLocationRead(
                id=row["target_location_id"],
                label=row["target_location_label"],
                latitude=row["target_latitude"],
                longitude=row["target_longitude"],
                evidence_quote=row["target_location_evidence_quote"],
            ),
        ),
    )
