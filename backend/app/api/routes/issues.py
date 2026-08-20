"""Read-only endpoints for validated Issue-first Terra Insight data."""

from fastapi import APIRouter, HTTPException
from sqlalchemy.engine import Engine

from app.schemas.issues import IssueDetail, IssueEventDetail, IssueListItem
from app.services.issues import get_issue, get_issue_event, list_issues

_UNCONFIGURED_MESSAGE = (
    "The validated Issue analysis is not configured on this backend. "
    "Set TERRA_SUPABASE_URL and restart to read the local pipeline output."
)


def create_issues_router(engine: Engine | None) -> APIRouter:
    """Create the GET-only validated Issue API. No correction route belongs in Terra Insight."""

    router = APIRouter()

    def require_engine() -> Engine:
        if engine is None:
            raise HTTPException(status_code=503, detail=_UNCONFIGURED_MESSAGE)
        return engine

    @router.get("/api/issues", response_model=list[IssueListItem])
    def list_issues_route() -> list[IssueListItem]:
        return list_issues(require_engine())

    @router.get("/api/issues/{issue_id}", response_model=IssueDetail)
    def get_issue_route(issue_id: str) -> IssueDetail:
        issue = get_issue(require_engine(), issue_id)
        if issue is None:
            raise HTTPException(status_code=404, detail="Issue not found.")
        return issue

    @router.get("/api/issues/{issue_id}/events/{event_id}", response_model=IssueEventDetail)
    def get_issue_event_route(issue_id: str, event_id: str) -> IssueEventDetail:
        event = get_issue_event(require_engine(), issue_id, event_id)
        if event is None:
            raise HTTPException(status_code=404, detail="Event not found.")
        return event

    return router
