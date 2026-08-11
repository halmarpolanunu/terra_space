from app.services.supabase_bridge import (
    bridge_dashboard_summary,
    filter_bridge_events,
    get_bridge_event,
    get_bridge_source,
    list_bridge_actors,
    list_bridge_candidate_reviews,
    list_bridge_event_types,
    list_bridge_events,
    list_bridge_sources,
)
from tests.supabase_bridge_test_support import (  # noqa: F401
    bridge_db,
    bridge_read_only_engine,
    insert_actor,
    insert_candidate_result,
    insert_event,
    insert_event_run,
    insert_event_type,
    insert_location,
    insert_source,
)


def test_list_bridge_sources_returns_phase1_rows(bridge_db, bridge_read_only_engine) -> None:
    insert_source(bridge_db, title="French Rafale shot down drone", processing_status="completed")

    sources = list_bridge_sources(bridge_read_only_engine)

    assert len(sources) == 1
    assert sources[0].title == "French Rafale shot down drone"
    assert sources[0].processing_status == "completed"


def test_get_bridge_source_returns_none_for_unknown_id(bridge_db, bridge_read_only_engine) -> None:
    assert get_bridge_source(bridge_read_only_engine, "00000000-0000-0000-0000-000000000000") is None


def test_get_bridge_source_returns_the_matching_row(bridge_db, bridge_read_only_engine) -> None:
    source_id = insert_source(bridge_db, title="Match me")

    found = get_bridge_source(bridge_read_only_engine, source_id)

    assert found is not None
    assert found.id == source_id
    assert found.title == "Match me"


def test_list_bridge_candidate_reviews_parses_pipeline_json(bridge_db, bridge_read_only_engine) -> None:
    source_id = insert_source(bridge_db, title="Source with candidates")
    insert_candidate_result(bridge_db, source_id)

    reviews = list_bridge_candidate_reviews(bridge_read_only_engine)

    assert len(reviews) == 1
    review = reviews[0]
    assert review.phase1_source_id == source_id
    assert review.source_title == "Source with candidates"
    assert review.main_issue_status == "MAIN_ISSUE_FOUND"
    assert review.main_issue.label == "Test main issue"
    assert len(review.event_candidates) == 1
    assert review.event_candidates[0].working_title == "Test candidate"
    assert review.event_candidates[0].entities == ["Entity A"]


def test_list_bridge_events_returns_published_and_hidden_but_not_owner_decided(
    bridge_db, bridge_read_only_engine
) -> None:
    """Per decisions/Automatic-Event-Visibility-With-Manual-Filtering.md: a pipeline EXCEPTION
    (hidden) now shows automatically, alongside published; only a deliberate owner decision
    (rejected/archived) stays excluded."""

    source_id = insert_source(bridge_db)
    insert_event(bridge_db, source_id, dashboard_status="published", title="Published event")
    insert_event(bridge_db, source_id, dashboard_status="hidden", title="Hidden exception")
    insert_event(bridge_db, source_id, dashboard_status="rejected", title="Rejected event")
    insert_event(bridge_db, source_id, dashboard_status="archived", title="Archived event")

    events = list_bridge_events(bridge_read_only_engine)

    assert {event.title for event in events} == {"Published event", "Hidden exception"}
    assert all(event.review_status == "approved" for event in events)


def test_list_bridge_events_marks_pipeline_outcome_and_dashboard_status(
    bridge_db, bridge_read_only_engine
) -> None:
    source_id = insert_source(bridge_db)
    insert_event(
        bridge_db, source_id, dashboard_status="published", pipeline_outcome="FINAL", title="Final"
    )
    insert_event(
        bridge_db,
        source_id,
        dashboard_status="hidden",
        pipeline_outcome="EXCEPTION",
        title="Exception",
    )

    events = {event.title: event for event in list_bridge_events(bridge_read_only_engine)}

    assert events["Final"].pipeline_outcome == "FINAL"
    assert events["Final"].dashboard_status == "published"
    assert events["Final"].exception_reason is None
    assert events["Exception"].pipeline_outcome == "EXCEPTION"
    assert events["Exception"].dashboard_status == "hidden"


def test_list_bridge_events_builds_exception_reason_from_latest_run(
    bridge_db, bridge_read_only_engine
) -> None:
    source_id = insert_source(bridge_db)
    candidate_key = "candidate-1:0:5"
    insert_event(
        bridge_db,
        source_id,
        dashboard_status="hidden",
        pipeline_outcome="EXCEPTION",
        title="Exception with reason",
        candidate_key=candidate_key,
    )
    insert_event_run(
        bridge_db,
        candidate_key,
        source_id,
        safeguard_reasons='["Evidence quote does not support the claimed actor."]',
    )

    [event] = list_bridge_events(bridge_read_only_engine)

    assert event.exception_reason == "Evidence quote does not support the claimed actor."


def test_filter_bridge_events_by_dashboard_status(bridge_db, bridge_read_only_engine) -> None:
    source_id = insert_source(bridge_db)
    insert_event(bridge_db, source_id, dashboard_status="published", title="Published event")
    insert_event(bridge_db, source_id, dashboard_status="hidden", title="Hidden exception")

    published_only = filter_bridge_events(
        list_bridge_events(bridge_read_only_engine), dashboard_status="published"
    )
    hidden_only = filter_bridge_events(
        list_bridge_events(bridge_read_only_engine), dashboard_status="hidden"
    )

    assert [event.title for event in published_only] == ["Published event"]
    assert [event.title for event in hidden_only] == ["Hidden exception"]


def test_list_bridge_events_joins_actors_locations_and_sources(bridge_db, bridge_read_only_engine) -> None:
    source_id = insert_source(bridge_db, title="Grounding article")
    type_id = insert_event_type(bridge_db, "Military Mobilization")
    actor_id = insert_actor(bridge_db, "Test Actor")
    location_id = insert_location(bridge_db, country_iso3="LVA")
    insert_event(
        bridge_db,
        source_id,
        event_type_id=type_id,
        actor_ids=[(actor_id, "source")],
        location_ids=[location_id],
        title="Joined event",
    )

    [event] = list_bridge_events(bridge_read_only_engine)

    assert event.event_type is not None
    assert event.event_type.name == "Military Mobilization"
    assert [actor.actor.name for actor in event.actors] == ["Test Actor"]
    assert event.actors[0].role == "source"
    assert [location.country for location in event.locations] == ["LVA"]
    assert event.sources[0].source_id == source_id
    assert event.sources[0].document_id is None
    assert event.sources[0].reference_label == "Joined event"


def test_list_bridge_events_accepts_the_full_epistemic_status_set(
    bridge_db, bridge_read_only_engine
) -> None:
    source_id = insert_source(bridge_db)
    for status in ("confirmed", "reported", "alleged", "planned", "denied", "unknown"):
        insert_event(bridge_db, source_id, title=f"Event {status}", epistemic_status=status)

    events = list_bridge_events(bridge_read_only_engine)

    assert {event.epistemic_status for event in events} == {
        "confirmed",
        "reported",
        "alleged",
        "planned",
        "denied",
        "unknown",
    }


def test_get_bridge_event_returns_hidden_events_too(bridge_db, bridge_read_only_engine) -> None:
    """A hidden (EXCEPTION) event is now a normal, visible event -- see
    decisions/Automatic-Event-Visibility-With-Manual-Filtering.md."""

    source_id = insert_source(bridge_db)
    hidden_id = insert_event(bridge_db, source_id, dashboard_status="hidden")

    found = get_bridge_event(bridge_read_only_engine, hidden_id)

    assert found is not None
    assert found.dashboard_status == "hidden"


def test_get_bridge_event_returns_none_for_owner_rejected_event(
    bridge_db, bridge_read_only_engine
) -> None:
    source_id = insert_source(bridge_db)
    rejected_id = insert_event(bridge_db, source_id, dashboard_status="rejected")

    assert get_bridge_event(bridge_read_only_engine, rejected_id) is None


def test_list_bridge_event_types_and_actors(bridge_db, bridge_read_only_engine) -> None:
    insert_event_type(bridge_db, "Diplomatic Statement")
    insert_actor(bridge_db, "Some Actor")

    event_types = list_bridge_event_types(bridge_read_only_engine)
    actors = list_bridge_actors(bridge_read_only_engine)

    assert [t.name for t in event_types] == ["Diplomatic Statement"]
    assert [a.name for a in actors] == ["Some Actor"]


def test_filter_bridge_events_by_query_text() -> None:
    from app.schemas.event import EventRead

    def make(title: str, summary: str = "summary") -> EventRead:
        return EventRead(
            id=title,
            title=title,
            summary=summary,
            event_date=None,
            event_date_precision=None,
            epistemic_status="confirmed",
            review_status="approved",
            event_type=None,
            actors=[],
            locations=[],
            sources=[],
            duplicate_flags=[],
            extraction_incomplete=False,
            extraction_incomplete_stages=[],
            created_at="2026-08-01T00:00:00Z",
            updated_at="2026-08-01T00:00:00Z",
            approved_at=None,
        )

    events = [make("Alpha strike"), make("Beta talks")]

    filtered = filter_bridge_events(events, q="strike")

    assert [event.title for event in filtered] == ["Alpha strike"]


def test_bridge_dashboard_summary_counts_by_type() -> None:
    from app.schemas.event import EventRead, EventTypeRead

    def make(title: str, type_name: str | None) -> EventRead:
        return EventRead(
            id=title,
            title=title,
            summary="summary",
            event_date=None,
            event_date_precision="unknown",
            epistemic_status="confirmed",
            review_status="approved",
            event_type=EventTypeRead(id=type_name, name=type_name, description=None, is_active=True)
            if type_name
            else None,
            actors=[],
            locations=[],
            sources=[],
            duplicate_flags=[],
            extraction_incomplete=False,
            extraction_incomplete_stages=[],
            created_at="2026-08-01T00:00:00Z",
            updated_at="2026-08-01T00:00:00Z",
            approved_at=None,
        )

    events = [make("A", "War"), make("B", "War"), make("C", None)]

    summary = bridge_dashboard_summary(events)

    assert summary.total_events == 3
    assert {item.name: item.count for item in summary.by_event_type} == {"War": 2, "Uncategorized": 1}
    assert summary.incomplete_date_count == 3
    assert summary.incomplete_location_count == 3


def test_bridge_dashboard_summary_counts_exceptions() -> None:
    from app.schemas.event import EventRead

    def make(title: str, pipeline_outcome: str | None) -> EventRead:
        return EventRead(
            id=title,
            title=title,
            summary="summary",
            event_date=None,
            event_date_precision="unknown",
            epistemic_status="confirmed",
            review_status="approved",
            event_type=None,
            actors=[],
            locations=[],
            sources=[],
            duplicate_flags=[],
            extraction_incomplete=False,
            extraction_incomplete_stages=[],
            created_at="2026-08-01T00:00:00Z",
            updated_at="2026-08-01T00:00:00Z",
            approved_at=None,
            pipeline_outcome=pipeline_outcome,
        )

    events = [make("A", "FINAL"), make("B", "EXCEPTION"), make("C", "EXCEPTION")]

    summary = bridge_dashboard_summary(events)

    assert summary.exception_count == 2
