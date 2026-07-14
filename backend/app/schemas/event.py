from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

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
    coordinate_precision: Literal["country", "admin1", "city_regency"] | None


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


class EventTypeInput(BaseModel):
    existing: str | None = None
    suggested: str | None = None


class ActorInput(BaseModel):
    name: str
    role: ActorRole


class LocationInput(BaseModel):
    country: str | None = None
    admin1: str | None = None
    city_regency: str | None = None


class EventCreate(BaseModel):
    document_id: str
    evidence_quote: str
    title: str
    summary: str
    event_type: EventTypeInput | None = None
    start_date: str | None = None
    start_date_precision: DatePrecision | None = None
    end_date: str | None = None
    end_date_precision: DatePrecision | None = None
    epistemic_status: EpistemicStatus
    locations: list[LocationInput] = Field(default_factory=list)
    actors: list[ActorInput] = Field(default_factory=list)


class EventUpdate(BaseModel):
    title: str | None = None
    summary: str | None = None
    event_type: EventTypeInput | None = None
    start_date: str | None = None
    start_date_precision: DatePrecision | None = None
    end_date: str | None = None
    end_date_precision: DatePrecision | None = None
    epistemic_status: EpistemicStatus | None = None
    locations: list[LocationInput] | None = None
    actors: list[ActorInput] | None = None


class ApproveAllSkipped(BaseModel):
    event_id: str
    reason: str


class ApproveAllResponse(BaseModel):
    approved_event_ids: list[str]
    skipped: list[ApproveAllSkipped]


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
    approved_at: datetime | None
