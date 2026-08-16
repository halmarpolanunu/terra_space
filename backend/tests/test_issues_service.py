"""Read-only queries for the parallel, validated Issue-first analysis contract."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from app.services.issues import get_issue, get_issue_event, list_issues
from tests.supabase_bridge_test_support import (  # noqa: F401
    bridge_db,
    bridge_read_only_engine,
    insert_source,
)


def _seed_issue(
    conn,
    *,
    source_id: str,
    label: str,
    processed_at: datetime,
    event_titles: list[str],
) -> tuple[str, list[str]]:
    """Insert validated test rows directly into the disposable database only."""

    run_id = str(uuid.uuid4())
    issue_id = str(uuid.uuid4())
    conn.execute(
        """
        insert into public.terra_space_issue_v2_runs
            (id, source_id, status, stage, processed_at)
        values (%s, %s, 'succeeded', 'complete', %s)
        """,
        (run_id, source_id, processed_at),
    )
    conn.execute(
        """
        insert into public.terra_space_issue_v2_issues
            (id, run_id, source_id, label, summary, evidence_quote, validated_at, created_at)
        values (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            issue_id,
            run_id,
            source_id,
            label,
            f"{label} summary",
            f"{label} evidence",
            processed_at,
            processed_at,
        ),
    )
    event_ids: list[str] = []
    for index, title in enumerate(event_titles):
        event_id = str(uuid.uuid4())
        event_ids.append(event_id)
        created_at = processed_at + timedelta(seconds=index)
        conn.execute(
            """
            insert into public.terra_space_issue_v2_events
                (id, issue_id, run_id, title, evidence_quote, validated_at, created_at)
            values (%s, %s, %s, %s, %s, %s, %s)
            """,
            (event_id, issue_id, run_id, title, f"{title} evidence", created_at, created_at),
        )
    return issue_id, event_ids


def _seed_relationship(conn, *, event_id: str, label: str, created_at: datetime) -> str:
    relationship_id = str(uuid.uuid4())
    source_location_id = str(uuid.uuid4())
    target_location_id = str(uuid.uuid4())
    conn.execute(
        """
        insert into public.terra_space_issue_v2_locations
            (id, label, latitude, longitude, evidence_quote, created_at)
        values
            (%s, %s, 1.0, 2.0, %s, %s),
            (%s, %s, 3.0, 4.0, %s, %s)
        """,
        (
            source_location_id,
            f"{label} source place",
            f"{label} source evidence",
            created_at,
            target_location_id,
            f"{label} target place",
            f"{label} target evidence",
            created_at,
        ),
    )
    conn.execute(
        """
        insert into public.terra_space_issue_v2_relationships
            (id, event_id, evidence_quote, created_at)
        values (%s, %s, %s, %s)
        """,
        (relationship_id, event_id, f"{label} relationship evidence", created_at),
    )
    conn.execute(
        """
        insert into public.terra_space_issue_v2_relationship_endpoints
            (relationship_id, role, actor_name, location_id, evidence_quote, created_at)
        values
            (%s, 'source', %s, %s, %s, %s),
            (%s, 'target', %s, %s, %s, %s)
        """,
        (
            relationship_id,
            f"{label} source actor",
            source_location_id,
            f"{label} source evidence",
            created_at,
            relationship_id,
            f"{label} target actor",
            target_location_id,
            f"{label} target evidence",
            created_at,
        ),
    )
    conn.execute(
        "update public.terra_space_issue_v2_relationships set validated_at = %s where id = %s",
        (created_at, relationship_id),
    )
    return relationship_id


def test_list_issues_returns_newest_valid_issue_first(bridge_db, bridge_read_only_engine) -> None:
    now = datetime(2026, 8, 16, tzinfo=UTC)
    older_source = insert_source(bridge_db, title="Older source")
    newer_source = insert_source(bridge_db, title="Newer source")
    _seed_issue(
        bridge_db,
        source_id=older_source,
        label="Older Issue",
        processed_at=now,
        event_titles=["Older event"],
    )
    _seed_issue(
        bridge_db,
        source_id=newer_source,
        label="Newer Issue",
        processed_at=now + timedelta(minutes=1),
        event_titles=["Newer event"],
    )

    issues = list_issues(bridge_read_only_engine)

    assert [issue.label for issue in issues] == ["Newer Issue", "Older Issue"]
    assert [issue.source_title for issue in issues] == ["Newer source", "Older source"]


def test_get_issue_only_returns_its_own_valid_events(bridge_db, bridge_read_only_engine) -> None:
    now = datetime(2026, 8, 16, tzinfo=UTC)
    first_source = insert_source(bridge_db, title="First source")
    second_source = insert_source(bridge_db, title="Second source")
    first_issue_id, _ = _seed_issue(
        bridge_db,
        source_id=first_source,
        label="First Issue",
        processed_at=now,
        event_titles=["First event"],
    )
    _seed_issue(
        bridge_db,
        source_id=second_source,
        label="Second Issue",
        processed_at=now + timedelta(minutes=1),
        event_titles=["Second event"],
    )

    issue = get_issue(bridge_read_only_engine, first_issue_id)

    assert issue is not None
    assert issue.label == "First Issue"
    assert [event.title for event in issue.events] == ["First event"]


def test_event_detail_omits_an_incomplete_relationship(bridge_db, bridge_read_only_engine) -> None:
    now = datetime(2026, 8, 16, tzinfo=UTC)
    source_id = insert_source(bridge_db)
    issue_id, [event_id] = _seed_issue(
        bridge_db,
        source_id=source_id,
        label="Issue without a mappable arc",
        processed_at=now,
        event_titles=["Mapped event"],
    )
    bridge_db.execute(
        """
        insert into public.terra_space_issue_v2_relationships
            (id, event_id, evidence_quote, created_at)
        values (%s, %s, 'Incomplete relationship evidence', %s)
        """,
        (str(uuid.uuid4()), event_id, now),
    )

    event = get_issue_event(bridge_read_only_engine, issue_id, event_id)

    assert event is not None
    assert event.title == "Mapped event"
    assert event.relationships == []


def test_event_detail_returns_valid_relationships_in_created_order(
    bridge_db, bridge_read_only_engine
) -> None:
    now = datetime(2026, 8, 16, tzinfo=UTC)
    source_id = insert_source(bridge_db)
    issue_id, [event_id] = _seed_issue(
        bridge_db,
        source_id=source_id,
        label="Relationship Issue",
        processed_at=now,
        event_titles=["Relationship event"],
    )
    first_id = _seed_relationship(
        bridge_db, event_id=event_id, label="First", created_at=now + timedelta(seconds=1)
    )
    second_id = _seed_relationship(
        bridge_db, event_id=event_id, label="Second", created_at=now + timedelta(seconds=2)
    )

    event = get_issue_event(bridge_read_only_engine, issue_id, event_id)

    assert event is not None
    assert [relationship.id for relationship in event.relationships] == [first_id, second_id]
    assert event.relationships[0].source.actor_name == "First source actor"
    assert event.relationships[0].source.location.latitude == 1.0
    assert event.relationships[0].target.actor_name == "First target actor"
    assert event.relationships[0].target.location.longitude == 4.0


def test_unknown_issue_or_event_is_absent(bridge_db, bridge_read_only_engine) -> None:
    assert get_issue(bridge_read_only_engine, str(uuid.uuid4())) is None
    assert get_issue_event(bridge_read_only_engine, str(uuid.uuid4()), str(uuid.uuid4())) is None
