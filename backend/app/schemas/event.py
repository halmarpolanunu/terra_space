from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

EpistemicStatus = Literal["confirmed", "claim", "rumor", "denied"]
DatePrecision = Literal["exact", "month", "year", "unknown"]
ReviewStatus = Literal["draft", "approved", "rejected", "merged"]
ActorRole = Literal["source", "target"]
DuplicateResolution = Literal["pending", "kept_separate", "linked"]


class EventTypeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    is_active: bool


class ActorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    is_active: bool


class EventActorRead(BaseModel):
    role: ActorRole
    actor: ActorRead


class LocationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    country: str | None
    admin1: str | None
    city_regency: str | None
    latitude: float | None
    longitude: float | None


class EventSourceRead(BaseModel):
    source_id: str
    document_id: str | None
    reference_label: str
    evidence_quote: str | None


class DuplicateFlagRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    matched_event_id: str
    matched_reason: str
    resolution: DuplicateResolution
    resolved_at: datetime | None


class EventRead(BaseModel):
    id: str
    title: str
    summary: str
    start_date: str | None
    start_date_precision: DatePrecision | None
    end_date: str | None
    end_date_precision: DatePrecision | None
    epistemic_status: EpistemicStatus
    review_status: ReviewStatus
    event_type: EventTypeRead | None
    actors: list[EventActorRead]
    locations: list[LocationRead]
    sources: list[EventSourceRead]
    duplicate_flags: list[DuplicateFlagRead]
    created_at: datetime
    updated_at: datetime
