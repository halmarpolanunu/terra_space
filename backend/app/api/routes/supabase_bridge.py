from datetime import date
from typing import Literal

from fastapi import APIRouter, HTTPException
from sqlalchemy.engine import Engine

from app.schemas.event import ActorRead, DashboardSummaryRead, EventRead, EventTypeRead
from app.schemas.supabase_bridge import BridgeCandidateReviewRead, BridgeModeRead, BridgeSourceRead, Phase5EventRead, PipelineReviewRead
from app.services.phase5_events import get_phase5_event, list_phase5_events
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
    list_pipeline_reviews,
)

_UNCONFIGURED_MESSAGE = (
    "The Supabase read-only preview is not configured on this backend. "
    "Set TERRA_SUPABASE_URL and restart to see live pipeline data here."
)


def create_supabase_bridge_router(engine: Engine | None) -> APIRouter:
    """Every route here is a plain GET against local Supabase. See the design doc:
    project-knowledge/plans/2026-08-11-supabase-read-only-bridge-design.md -- this router must
    never gain a POST/PATCH/PUT/DELETE route.
    """

    router = APIRouter()

    def require_engine() -> Engine:
        if engine is None:
            raise HTTPException(status_code=503, detail=_UNCONFIGURED_MESSAGE)
        return engine

    @router.get("/api/bridge/mode", response_model=BridgeModeRead)
    def mode() -> BridgeModeRead:
        if engine is None:
            return BridgeModeRead(configured=False, message=_UNCONFIGURED_MESSAGE)
        return BridgeModeRead(
            configured=True,
            message=(
                "Read-only Supabase preview. Sources, Event Review, Events, and Dashboard show "
                "the live local pipeline data. Editing, approving, and reprocessing are turned "
                "off here."
            ),
        )

    @router.get("/api/bridge/sources", response_model=list[BridgeSourceRead])
    def list_sources_route() -> list[BridgeSourceRead]:
        return list_bridge_sources(require_engine())

    @router.get("/api/bridge/sources/{source_id}", response_model=BridgeSourceRead)
    def get_source_route(source_id: str) -> BridgeSourceRead:
        source = get_bridge_source(require_engine(), source_id)
        if source is None:
            raise HTTPException(status_code=404, detail="Source not found.")
        return source

    @router.get("/api/bridge/event-candidates", response_model=list[BridgeCandidateReviewRead])
    def list_candidate_reviews_route() -> list[BridgeCandidateReviewRead]:
        return list_bridge_candidate_reviews(require_engine())

    @router.get("/api/bridge/event-types", response_model=list[EventTypeRead])
    def list_event_types_route() -> list[EventTypeRead]:
        return list_bridge_event_types(require_engine())

    @router.get("/api/bridge/actors", response_model=list[ActorRead])
    def list_actors_route() -> list[ActorRead]:
        return list_bridge_actors(require_engine())

    @router.get("/api/bridge/events/dashboard-summary", response_model=DashboardSummaryRead)
    def dashboard_summary_route(
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
        dashboard_status: Literal["published", "hidden"] | None = None,
        sort: Literal["date_desc", "date_asc", "created_desc", "title_asc"] = "date_desc",
    ) -> DashboardSummaryRead:
        if date_from and date_to and date_from > date_to:
            raise HTTPException(status_code=422, detail="date_from must be on or before date_to.")
        events = filter_bridge_events(
            list_bridge_events(require_engine()),
            q=q,
            date_from=date_from,
            date_to=date_to,
            event_type_id=event_type_id,
            epistemic_status=epistemic_status,
            actor_id=actor_id,
            country=country,
            admin1=admin1,
            city_regency=city_regency,
            document_id=document_id,
            dashboard_status=dashboard_status,
            sort=sort,
        )
        return bridge_dashboard_summary(events)

    @router.get("/api/bridge/events", response_model=list[EventRead])
    def list_events_route(
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
        dashboard_status: Literal["published", "hidden"] | None = None,
        sort: Literal["date_desc", "date_asc", "created_desc", "title_asc"] = "date_desc",
    ) -> list[EventRead]:
        if date_from and date_to and date_from > date_to:
            raise HTTPException(status_code=422, detail="date_from must be on or before date_to.")
        return filter_bridge_events(
            list_bridge_events(require_engine()),
            q=q,
            date_from=date_from,
            date_to=date_to,
            event_type_id=event_type_id,
            epistemic_status=epistemic_status,
            actor_id=actor_id,
            country=country,
            admin1=admin1,
            city_regency=city_regency,
            document_id=document_id,
            dashboard_status=dashboard_status,
            sort=sort,
        )

    @router.get("/api/bridge/events/{event_id}", response_model=EventRead)
    def get_event_route(event_id: str) -> EventRead:
        event = get_bridge_event(require_engine(), event_id)
        if event is None:
            raise HTTPException(status_code=404, detail="Event not found.")
        return event

    @router.get("/api/bridge/phase5-events", response_model=list[Phase5EventRead])
    def list_phase5_events_route() -> list[Phase5EventRead]:
        return list_phase5_events(require_engine())

    @router.get("/api/bridge/pipeline-reviews", response_model=list[PipelineReviewRead])
    def list_pipeline_reviews_route() -> list[PipelineReviewRead]:
        return list_pipeline_reviews(require_engine())

    @router.get("/api/bridge/phase5-events/{event_id}", response_model=Phase5EventRead)
    def get_phase5_event_route(event_id: str) -> Phase5EventRead:
        event = get_phase5_event(require_engine(), event_id)
        if event is None:
            raise HTTPException(status_code=404, detail="Phase 5 event not found.")
        return event

    return router
