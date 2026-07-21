from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

EpistemicStatus = Literal["confirmed", "claim", "rumor", "denied"]
DatePrecision = Literal["exact", "month", "year", "unknown"]
ReviewStatus = Literal["draft", "approved", "rejected", "merged"]
ActorRole = Literal["source", "target"]
DuplicateResolution = Literal["pending", "kept_separate", "linked"]
TaxonomyLevel = Literal["domain", "category", "subcategory", "event_type"]


class TaxonomyPathSegment(BaseModel):
    id: str
    name: str
    level: TaxonomyLevel


class EventTypeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None
    is_active: bool
    in_use: bool = False
    taxonomy_path: list[TaxonomyPathSegment] = Field(default_factory=list)


class EventTypeCreate(BaseModel):
    name: str = Field(min_length=1)
    description: str = Field(min_length=1, max_length=1000)


class EventTypeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    description: str | None = Field(default=None, max_length=1000)
    is_active: bool | None = None


class TaxonomyNodeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    level: TaxonomyLevel
    parent_id: str | None = None
    description: str | None = Field(default=None, max_length=1000)


class TaxonomyNodeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    is_active: bool | None = None


class TaxonomyNodeRead(BaseModel):
    id: str
    name: str
    level: TaxonomyLevel
    parent_id: str | None
    event_type: EventTypeRead | None = None
    children: list["TaxonomyNodeRead"] = Field(default_factory=list)


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
    model_config = ConfigDict(extra="forbid")

    existing: str | None = None


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
    event_date: str | None = None
    event_date_precision: DatePrecision | None = None
    epistemic_status: EpistemicStatus
    locations: list[LocationInput] = Field(default_factory=list)
    actors: list[ActorInput] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_date_and_precision(self) -> "EventCreate":
        from .date_validation import validate_event_date

        validate_event_date(self.event_date, self.event_date_precision)
        return self


class EventUpdate(BaseModel):
    title: str | None = None
    summary: str | None = None
    event_type: EventTypeInput | None = None
    event_date: str | None = None
    event_date_precision: DatePrecision | None = None
    epistemic_status: EpistemicStatus | None = None
    locations: list[LocationInput] | None = None
    actors: list[ActorInput] | None = None

    @model_validator(mode="after")
    def validate_date_and_precision(self) -> "EventUpdate":
        date_fields = {"event_date", "event_date_precision"}
        supplied_date_fields = date_fields & self.model_fields_set
        if supplied_date_fields and supplied_date_fields != date_fields:
            raise ValueError("Event date and its precision must be updated together.")
        if supplied_date_fields:
            from .date_validation import validate_event_date

            validate_event_date(self.event_date, self.event_date_precision)
        return self


class ApproveAllSkipped(BaseModel):
    event_id: str
    reason: str


class ApproveAllResponse(BaseModel):
    approved_event_ids: list[str]
    skipped: list[ApproveAllSkipped]


class EventTypeCount(BaseModel):
    name: str
    count: int


class DashboardSummaryRead(BaseModel):
    total_events: int
    new_events: int
    by_event_type: list[EventTypeCount]
    incomplete_date_count: int
    incomplete_location_count: int


class EventRead(BaseModel):
    id: str
    title: str
    summary: str
    event_date: str | None
    event_date_precision: DatePrecision | None
    epistemic_status: EpistemicStatus
    review_status: ReviewStatus
    event_type: EventTypeRead | None
    actors: list[EventActorRead]
    locations: list[LocationRead]
    sources: list[EventSourceRead]
    duplicate_flags: list[DuplicateFlagRead]
    extraction_incomplete: bool
    extraction_incomplete_stages: list[str]
    created_at: datetime
    updated_at: datetime
    approved_at: datetime | None
