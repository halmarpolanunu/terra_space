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
    issue.id, issue.source_id, source.title as source_title, issue.label, issue.summary,
    issue.evidence_quote, run.processed_at, issue.created_at
"""

_ISSUE_FROM = """
    from public.terra_space_issue_v2_valid_issues issue
    join public.terra_space_issue_v2_runs run on run.id = issue.run_id
    join public.terra_space_phase1_sources source on source.id = issue.source_id
"""

_EVENT_COLUMNS = """
    event.id, event.title, event.evidence_quote, event.created_at
"""


def list_issues(engine: Engine) -> list[IssueListItem]:
    """Return only the current valid Issue for each source, newest processing run first."""

    with engine.connect() as conn:
        rows = conn.execute(
            text(
                f"""
                select {_ISSUE_COLUMNS}
                {_ISSUE_FROM}
                order by run.processed_at desc, issue.created_at desc, issue.id desc
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
                {_ISSUE_FROM}
                where issue.id = :issue_id
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
                from public.terra_space_issue_v2_valid_events event
                where event.issue_id = :issue_id
                order by event.created_at asc, event.id asc
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
                from public.terra_space_issue_v2_valid_events event
                where event.issue_id = :issue_id and event.id = :event_id
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
                    relationship.id, relationship.evidence_quote,
                    source_endpoint.actor_name as source_actor_name,
                    source_endpoint.evidence_quote as source_evidence_quote,
                    source_location.id as source_location_id,
                    source_location.label as source_location_label,
                    source_location.latitude as source_latitude,
                    source_location.longitude as source_longitude,
                    source_location.evidence_quote as source_location_evidence_quote,
                    target_endpoint.actor_name as target_actor_name,
                    target_endpoint.evidence_quote as target_evidence_quote,
                    target_location.id as target_location_id,
                    target_location.label as target_location_label,
                    target_location.latitude as target_latitude,
                    target_location.longitude as target_longitude,
                    target_location.evidence_quote as target_location_evidence_quote
                from public.terra_space_issue_v2_valid_events event
                join public.terra_space_issue_v2_relationships relationship
                  on relationship.event_id = event.id
                 and relationship.validated_at is not null
                join public.terra_space_issue_v2_relationship_endpoints source_endpoint
                  on source_endpoint.relationship_id = relationship.id
                 and source_endpoint.role = 'source'
                join public.terra_space_issue_v2_locations source_location
                  on source_location.id = source_endpoint.location_id
                join public.terra_space_issue_v2_relationship_endpoints target_endpoint
                  on target_endpoint.relationship_id = relationship.id
                 and target_endpoint.role = 'target'
                join public.terra_space_issue_v2_locations target_location
                  on target_location.id = target_endpoint.location_id
                where event.issue_id = :issue_id and event.id = :event_id
                order by relationship.created_at asc, relationship.id asc
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
