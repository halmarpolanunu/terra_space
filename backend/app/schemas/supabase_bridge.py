"""Read-only response shapes for the Supabase bridge.

Events reuse the existing `app.schemas.event` types (`EventRead`, `EventTypeRead`, `ActorRead`,
`DashboardSummaryRead`) so the frontend's Dashboard/Events UI can consume bridge data with no
shape changes. Phase 1 sources and Phase 2 candidate reviews have no equivalent in the old
SQLite domain model, so they get their own honestly-scoped types here instead of being forced
into a shape that implies capabilities (editing, attachments, approval) this bridge does not
have.
"""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

BridgeProcessingStatus = Literal[
    "draft", "queued", "processing", "ready_for_review", "completed", "failed"
]
MainIssueStatus = Literal["MAIN_ISSUE_FOUND", "NO_MAIN_ISSUE", "FAILED"]
EventDetectionStatus = Literal[
    "EVENT_CANDIDATES_FOUND", "NO_EVENT_CANDIDATE", "NOT_RUN", "FAILED"
]


class BridgeModeRead(BaseModel):
    """Tells the frontend whether the bridge is configured and reachable, and why not if not."""

    configured: bool
    read_only: bool = True
    data_source: Literal["supabase"] = "supabase"
    message: str


class BridgeSourceRead(BaseModel):
    """One Phase 1 source, exactly as `terra_space_phase1_sources` stores it."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    publication_date: str
    source_domain: str
    source_url: str
    author: str
    collection_source: str
    processing_status: BridgeProcessingStatus
    processing_error: str | None
    raw_content_text: str
    cleaned_content_text: str | None
    created_at: datetime
    updated_at: datetime


class BridgeMainIssue(BaseModel):
    """The grounded main issue a Phase 2 run found for one source, if any."""

    label: str | None = None
    summary: str | None = None
    evidence_quote: str | None = None
    evidence_start: int | None = None
    evidence_end: int | None = None
    quote_grounded: bool | None = None


class BridgeCandidate(BaseModel):
    """One provisional event candidate from a Phase 2 run."""

    working_title: str | None = None
    classification: str | None = None
    phenomenon: str | None = None
    entities: list[str] = Field(default_factory=list)
    evidence_quote: str | None = None
    evidence_start: int | None = None
    evidence_end: int | None = None
    quote_grounded: bool | None = None


class BridgeCandidateReviewRead(BaseModel):
    """The latest Phase 2 result for one Phase 1 source: read-only pipeline output."""

    phase1_source_id: str
    source_title: str
    main_issue_status: MainIssueStatus
    main_issue: BridgeMainIssue | None
    event_detection_status: EventDetectionStatus
    event_candidates: list[BridgeCandidate] = Field(default_factory=list)
    processed_at: datetime


class Phase5ClassificationRead(BaseModel):
    status: str | None
    event_type_id: str | None
    event_type_name: str | None
    reason: str | None
    safeguard_status: str | None
    safeguard_reason: str | None


class Phase5TimelineRead(BaseModel):
    status: str | None
    event_date: str | None
    event_date_precision: str | None
    reference_date: str | None
    reference_basis: str | None
    limitations: list[str] = Field(default_factory=list)
    error_message: str | None


class Phase5QualificationRead(BaseModel):
    status: Literal["FINAL", "NOT_FINAL"] | None
    reason_codes: list[str] = Field(default_factory=list)


class Phase5EventRead(BaseModel):
    """Read-only Phase 5 projection; deliberately distinct from the older EventRead contract."""

    id: str
    phase1_source_id: str
    title: str
    description: str
    evidence_quote: str
    source_publication_date: str | None
    event_path: str
    phase5a_status: str
    phase3_result_status: str
    phase3_result_reason: str | None
    phase3_candidate_status: str
    phase3_candidate_reason: str | None
    phase4_status: str
    phase4_extraction_status: str
    phase4_safeguard_status: str
    phase4_review_reason: str | None
    phase4_error_message: str | None
    facts: dict[str, Any]
    classification: Phase5ClassificationRead
    timeline: Phase5TimelineRead
    event_geographies: list[dict[str, Any]] = Field(default_factory=list)
    event_geography_status: str | None
    actor_geographies: list[dict[str, Any]] = Field(default_factory=list)
    actor_geography_status: str | None
    qualification: Phase5QualificationRead
    duplicate_recommendations: list[dict[str, Any]] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
