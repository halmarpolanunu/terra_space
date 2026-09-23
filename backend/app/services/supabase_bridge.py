"""Read-only queries against the local Supabase database.

Every function here takes a SQLAlchemy `Engine` connected through
`app.db.supabase_bridge.create_supabase_read_only_engine` and issues plain parameterized
`text()` SELECT statements -- no ORM mapping, no write statement anywhere in this module.
Table names match the live database's `terra_space_` prefix (see the implementation plan's
"Pre-existing discrepancy" section for why).
"""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.schemas.event import (
    ActorRead,
    DashboardSummaryRead,
    EventActorRead,
    EventRead,
    EventSourceRead,
    EventTypeCount,
    EventTypeRead,
    LocationRead,
)
from app.schemas.supabase_bridge import BridgeCandidateReviewRead, BridgeSourceRead, PipelineReviewRead

_SOURCE_COLUMNS = """
    id, title, publication_date, source_domain, source_url, author, collection_source,
    processing_status, processing_error, raw_content_text, cleaned_content_text,
    created_at, updated_at
"""


def list_bridge_sources(engine: Engine) -> list[BridgeSourceRead]:
    """All Phase 1 sources, newest first."""

    with engine.connect() as conn:
        rows = conn.execute(
            text(f"select {_SOURCE_COLUMNS} from terra_space.terra_space_phase1_sources order by created_at desc")
        ).mappings()
        return [BridgeSourceRead.model_validate(dict(row)) for row in rows]


def get_bridge_source(engine: Engine, source_id: str) -> BridgeSourceRead | None:
    """One Phase 1 source by ID, or None if it does not exist."""

    with engine.connect() as conn:
        row = conn.execute(
            text(f"select {_SOURCE_COLUMNS} from terra_space.terra_space_phase1_sources where id = :id"),
            {"id": source_id},
        ).mappings().first()
        return BridgeSourceRead.model_validate(dict(row)) if row else None


def list_bridge_candidate_reviews(engine: Engine) -> list[BridgeCandidateReviewRead]:
    """Read candidate reviews from the current split Phase 2/3 tables when present."""

    with engine.connect() as conn:
        current_schema = conn.execute(text(
            "select to_regclass('terra_space.terra_space_phase2_main_issues') is not null"
        )).scalar()
        if current_schema:
            rows = conn.execute(text("""
                select m.phase1_source_id, s.title as source_title,
                       m.status as issue_status, m.issue_title, m.issue_description,
                       m.evidence_quote as issue_evidence_quote,
                       coalesce(c.detection_status, 'NOT_RUN') as event_detection_status,
                       coalesce(c.candidates, '[]'::jsonb) as candidates,
                       coalesce(c.processed_at, m.processed_at) as processed_at
                from terra_space.terra_space_phase2_main_issues m
                join terra_space.terra_space_phase1_sources s on s.id = m.phase1_source_id
                left join terra_space.terra_space_phase3_event_candidates c
                  on c.phase1_source_id = m.phase1_source_id
                order by m.processed_at desc
            """)).mappings()
            return [BridgeCandidateReviewRead(
                phase1_source_id=str(row["phase1_source_id"]),
                source_title=row["source_title"],
                main_issue_status=("FAILED" if row["issue_status"] == "FAILED" else
                                   "MAIN_ISSUE_FOUND" if row["issue_title"] else "NO_MAIN_ISSUE"),
                main_issue=({"label": row["issue_title"], "summary": row["issue_description"],
                             "evidence_quote": row["issue_evidence_quote"]}
                            if row["issue_title"] else None),
                event_detection_status=row["event_detection_status"],
                event_candidates=[{
                    "working_title": candidate.get("title"),
                    "phenomenon": candidate.get("description"),
                    "evidence_quote": candidate.get("evidence_quote"),
                } for candidate in row["candidates"]],
                processed_at=row["processed_at"],
            ) for row in rows]

        # Older isolated bridge tests and archived installations retain the combined table.
        rows = conn.execute(
            text(
                """
                select
                    c.phase1_source_id, s.title as source_title, c.main_issue_status,
                    c.main_issue, c.event_detection_status, c.event_candidates, c.processed_at
                from terra_space.terra_space_phase2_event_candidates c
                join terra_space.terra_space_phase1_sources s on s.id = c.phase1_source_id
                order by c.processed_at desc
                """
            )
        ).mappings()
        return [BridgeCandidateReviewRead.model_validate(dict(row)) for row in rows]


def list_pipeline_reviews(engine: Engine) -> list[PipelineReviewRead]:
    """Current read-only Phase 2 and Phase 3 records, one row per source."""

    with engine.connect() as conn:
        rows = conn.execute(text("""
            select m.phase1_source_id, s.title as source_title,
                   m.status as main_issue_status,
                   coalesce(c.detection_status, 'NOT_RUN') as event_detection_status,
                   coalesce(c.candidates, '[]'::jsonb) as candidates
            from terra_space.terra_space_phase2_main_issues m
            join terra_space.terra_space_phase1_sources s on s.id = m.phase1_source_id
            left join terra_space.terra_space_phase3_event_candidates c
              on c.phase1_source_id = m.phase1_source_id
            order by m.processed_at desc
        """)).mappings()
        return [PipelineReviewRead(
            phase1_source_id=str(row["phase1_source_id"]),
            source_title=row["source_title"],
            main_issue_status=row["main_issue_status"],
            event_detection_status=row["event_detection_status"],
            event_candidates=[{"title": candidate.get("title") or "Untitled candidate",
                               "status": candidate.get("status") or "UNKNOWN"}
                              for candidate in row["candidates"]],
        ) for row in rows]


_EVENT_QUERY = """
    select
        e.id, e.title, e.summary, e.event_date, e.event_date_precision, e.epistemic_status,
        e.published_at, e.created_at, e.updated_at, e.pipeline_outcome, e.dashboard_status,
        et.id as event_type_id, et.name as event_type_name, et.description as event_type_description,
        et.is_active as event_type_is_active,
        coalesce(actors.actors, '[]'::jsonb) as actors,
        coalesce(locations.locations, '[]'::jsonb) as locations,
        coalesce(sources.sources, '[]'::jsonb) as sources,
        latest_run.safeguard_reasons as exception_safeguard_reasons,
        latest_run.error_message as exception_error_message
    from terra_space.terra_space_phase3_events e
    left join terra_space.terra_space_phase3_event_types et on et.id = e.event_type_id
    left join lateral (
        select jsonb_agg(jsonb_build_object(
            'role', ea.role, 'id', a.id, 'name', a.name, 'is_active', a.is_active
        )) as actors
        from terra_space.terra_space_phase3_event_actors ea
        join terra_space.terra_space_phase3_actors a on a.id = ea.actor_id
        where ea.event_id = e.id
    ) actors on true
    left join lateral (
        select jsonb_agg(jsonb_build_object(
            'id', l.id, 'country', l.country_iso3, 'admin1', l.admin1,
            'city_regency', l.city_regency, 'latitude', l.latitude, 'longitude', l.longitude,
            'coordinate_precision', l.coordinate_precision
        )) as locations
        from terra_space.terra_space_phase3_event_locations el
        join terra_space.terra_space_phase3_locations l on l.id = el.location_id
        where el.event_id = e.id
    ) locations on true
    left join lateral (
        select jsonb_agg(jsonb_build_object(
            'phase1_source_id', es.phase1_source_id, 'reference_label', es.reference_label,
            'evidence_quote', es.evidence_quote
        )) as sources
        from terra_space.terra_space_phase3_event_sources es
        where es.event_id = e.id
    ) sources on true
    -- The most recent Phase 3 attempt for this candidate, used only to explain *why* an
    -- EXCEPTION happened (see decisions/Automatic-Event-Visibility-With-Manual-Filtering.md).
    -- Read-only, same as every other join here.
    left join lateral (
        select r.safeguard_reasons, r.error_message
        from terra_space.terra_space_phase3_event_runs r
        where r.candidate_key = e.candidate_key
        order by r.processed_at desc
        limit 1
    ) latest_run on e.candidate_key is not null
    -- Every automatic pipeline outcome (published/hidden) shows by default; only a deliberate
    -- human decision (rejected/archived/merged) stays excluded. See the decision above.
    where e.dashboard_status in ('published', 'hidden')
"""

_EVENT_LIST_ORDER = " order by e.event_date desc nulls last, e.created_at desc"


def _build_exception_reason(row: dict) -> str | None:
    """A short, human-readable reason for an EXCEPTION event, from its latest Phase 3 run.

    Prefers a stored error message; otherwise summarizes the safeguard's own reasons, in
    whatever shape Phase 3 recorded them (a list of strings, or a dict with a 'reasons' list).
    Returns None when the pipeline recorded nothing usable, or the event is not an EXCEPTION.
    """

    if row.get("pipeline_outcome") != "EXCEPTION":
        return None
    error_message = row.get("exception_error_message")
    if error_message:
        return str(error_message)
    reasons = row.get("exception_safeguard_reasons")
    if not reasons:
        return None
    if isinstance(reasons, list):
        return "; ".join(str(reason) for reason in reasons) or None
    if isinstance(reasons, dict):
        nested = reasons.get("reasons") or reasons.get("reason")
        if isinstance(nested, list):
            return "; ".join(str(reason) for reason in nested) or None
        if nested:
            return str(nested)
    return str(reasons)


def _to_event_read(row: dict) -> EventRead:
    event_type = (
        EventTypeRead(
            id=row["event_type_id"],
            name=row["event_type_name"],
            description=row["event_type_description"],
            is_active=row["event_type_is_active"],
            in_use=True,
        )
        if row["event_type_id"]
        else None
    )
    actors = [
        EventActorRead(
            role=actor["role"],
            actor=ActorRead(id=actor["id"], name=actor["name"], is_active=actor["is_active"]),
        )
        for actor in row["actors"]
    ]
    locations = [
        LocationRead(
            id=location["id"],
            country=location["country"],
            admin1=location["admin1"],
            city_regency=location["city_regency"],
            latitude=location["latitude"],
            longitude=location["longitude"],
            coordinate_precision=location["coordinate_precision"],
        )
        for location in row["locations"]
    ]
    sources = [
        EventSourceRead(
            source_id=source["phase1_source_id"],
            # This bridge does not give event sources a per-source detail page (see the
            # implementation plan's Non-goals); leaving document_id unset keeps the existing
            # EventDetail component from rendering a link into the SQLite-shaped document route.
            document_id=None,
            reference_label=source["reference_label"],
            evidence_quote=source["evidence_quote"],
        )
        for source in row["sources"]
    ]
    return EventRead(
        id=row["id"],
        title=row["title"],
        summary=row["summary"],
        event_date=row["event_date"],
        event_date_precision=row["event_date_precision"],
        epistemic_status=row["epistemic_status"],
        event_type=event_type,
        actors=actors,
        locations=locations,
        sources=sources,
        duplicate_flags=[],
        extraction_incomplete=False,
        extraction_incomplete_stages=[],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        approved_at=row["published_at"],
        pipeline_outcome=row["pipeline_outcome"],
        dashboard_status=row["dashboard_status"],
        exception_reason=_build_exception_reason(row),
    )


def list_bridge_events(engine: Engine) -> list[EventRead]:
    """Every published Phase 3 event -- the normal Dashboard result set."""

    with engine.connect() as conn:
        rows = conn.execute(text(_EVENT_QUERY + _EVENT_LIST_ORDER)).mappings()
        return [_to_event_read(dict(row)) for row in rows]


def get_bridge_event(engine: Engine, event_id: str) -> EventRead | None:
    """One published Phase 3 event by ID, or None if it does not exist or is not published."""

    with engine.connect() as conn:
        row = (
            conn.execute(text(_EVENT_QUERY + " and e.id = :id"), {"id": event_id}).mappings().first()
        )
        return _to_event_read(dict(row)) if row else None


def list_bridge_event_types(engine: Engine) -> list[EventTypeRead]:
    """Every Phase 3 event type, for the Events/Dashboard filter dropdown."""

    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                select id, name, description, is_active
                from terra_space.terra_space_phase3_event_types
                order by name
                """
            )
        ).mappings()
        return [
            EventTypeRead(
                id=row["id"],
                name=row["name"],
                description=row["description"],
                is_active=row["is_active"],
                in_use=True,
            )
            for row in rows
        ]


def list_bridge_actors(engine: Engine) -> list[ActorRead]:
    """Every Phase 3 actor, for the Events/Dashboard filter dropdown."""

    with engine.connect() as conn:
        rows = conn.execute(
            text("select id, name, is_active from terra_space.terra_space_phase3_actors order by name")
        ).mappings()
        return [ActorRead(id=row["id"], name=row["name"], is_active=row["is_active"]) for row in rows]


def bridge_dashboard_summary(events: list[EventRead]) -> DashboardSummaryRead:
    """The same summary shape `/api/events/dashboard-summary` returns, computed from bridge events."""

    now = datetime.now(UTC)
    week_ago = now - timedelta(days=7)
    counts: dict[str, int] = {}
    for event in events:
        name = event.event_type.name if event.event_type else "Uncategorized"
        counts[name] = counts.get(name, 0) + 1

    def published_within_week(event: EventRead) -> bool:
        if event.approved_at is None:
            return False
        published_at = event.approved_at
        if published_at.tzinfo is None:
            published_at = published_at.replace(tzinfo=UTC)
        return published_at >= week_ago

    return DashboardSummaryRead(
        total_events=len(events),
        new_events=sum(1 for event in events if published_within_week(event)),
        by_event_type=[
            EventTypeCount(name=name, count=count) for name, count in sorted(counts.items())
        ],
        incomplete_date_count=sum(
            1
            for event in events
            if not event.event_date or event.event_date_precision == "unknown"
        ),
        incomplete_location_count=sum(
            1
            for event in events
            if not any(
                location.latitude is not None and location.longitude is not None
                for location in event.locations
            )
        ),
        exception_count=sum(1 for event in events if event.pipeline_outcome == "EXCEPTION"),
    )


def _event_date_interval(event: EventRead) -> tuple[date, date] | None:
    """Mirrors `app.services.events._event_date_interval` for the bridge's EventRead shape."""

    if not event.event_date or event.event_date_precision == "unknown":
        return None
    try:
        if event.event_date_precision == "year":
            year = int(event.event_date)
            return date(year, 1, 1), date(year, 12, 31)
        if event.event_date_precision == "month":
            year, month = (int(value) for value in event.event_date.split("-"))
            first = date(year, month, 1)
            next_month = date(year + (month == 12), 1 if month == 12 else month + 1, 1)
            return first, next_month - timedelta(days=1)
        parsed = date.fromisoformat(event.event_date)
        return parsed, parsed
    except ValueError:
        return None


def filter_bridge_events(
    events: list[EventRead],
    *,
    q: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    event_type_id: str | None = None,
    epistemic_status: str | None = None,
    actor_id: str | None = None,
    country: str | None = None,
    admin1: str | None = None,
    city_regency: str | None = None,
    document_id: str | None = None,
    dashboard_status: str | None = None,
    sort: str = "date_desc",
) -> list[EventRead]:
    """Same in-memory filter/sort contract as `app.services.events.list_filtered_events`.

    `document_id` matches a bridge event's Phase 1 source ID (`EventSourceRead.source_id`),
    since bridge events carry no SQLite document identity. `dashboard_status` is the owner's
    manual visibility filter (see decisions/Automatic-Event-Visibility-With-Manual-Filtering.md):
    `"published"` or `"hidden"` narrows the view; blank/None returns both, which is the default
    the caller already receives from `list_bridge_events`.
    """

    needle = q.strip().casefold() if q else None

    def matches(event: EventRead) -> bool:
        if needle and needle not in event.title.casefold() and needle not in event.summary.casefold():
            return False
        if event_type_id and (event.event_type is None or event.event_type.id != event_type_id):
            return False
        if epistemic_status and event.epistemic_status != epistemic_status:
            return False
        if dashboard_status and event.dashboard_status != dashboard_status:
            return False
        if actor_id and actor_id not in {link.actor.id for link in event.actors}:
            return False
        if country and country not in {location.country for location in event.locations}:
            return False
        if admin1 and admin1 not in {location.admin1 for location in event.locations}:
            return False
        if city_regency and city_regency not in {
            location.city_regency for location in event.locations
        }:
            return False
        if document_id and document_id not in {source.source_id for source in event.sources}:
            return False
        if date_from or date_to:
            interval = _event_date_interval(event)
            if interval is None:
                return False
            start, end = interval
            if date_from and end < date_from:
                return False
            if date_to and start > date_to:
                return False
        return True

    filtered = [event for event in events if matches(event)]
    if sort == "title_asc":
        return sorted(filtered, key=lambda event: event.title.casefold())
    if sort == "created_desc":
        return sorted(filtered, key=lambda event: event.created_at, reverse=True)
    dated = [(event, _event_date_interval(event)) for event in filtered]
    known = [(event, interval) for event, interval in dated if interval is not None]
    unknown = [event for event, interval in dated if interval is None]
    known.sort(key=lambda item: item[1][0], reverse=sort != "date_asc")
    return [event for event, _interval in known] + unknown
