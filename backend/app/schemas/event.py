from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

# The full canonical set phase3_events' own CHECK constraint enforces (see
# decisions/Fresh-Phase-Prefixed-Supabase-Architecture.md). "claim"/"rumor" -- the old SQLite-only
# values -- were dropped once SQLite stopped being a write target for events; nothing produces
# them anymore.
EpistemicStatus = Literal["confirmed", "reported", "alleged", "planned", "denied", "unknown"]
DatePrecision = Literal["exact", "month", "year", "unknown"]
ActorRole = Literal["source", "target"]
DuplicateResolution = Literal["pending", "kept_separate", "linked"]
TaxonomyLevel = Literal["domain", "category", "subcategory", "event_type"]

# Replaces the old SQLite `ReviewStatus` (draft/approved/rejected/merged) entirely -- see
# decisions/Fresh-Phase-Prefixed-Supabase-Architecture.md and
# decisions/Automatic-Event-Visibility-With-Manual-Filtering.md.
Origin = Literal["pipeline", "manual"]
PipelineOutcome = Literal["FINAL", "EXCEPTION"]
DashboardStatus = Literal["published", "hidden", "rejected", "archived", "merged"]


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

    @field_validator("description", mode="before")
    @classmethod
    def blank_description_reads_as_none(cls, value: str | None) -> str | None:
        # terra_space_phase3_event_types.description is NOT NULL on the live table (a fresh
        # Postgres start has no legacy blank-description rows to accommodate), so "no
        # description" is stored as "" -- this keeps the API's existing null-means-"none"
        # contract.
        return value or None


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

    @field_validator("country")
    @classmethod
    def normalize_and_validate_country_code(cls, value: str | None) -> str | None:
        # terra_space_phase3_locations.country_iso3 is CHECKed to exactly '^[A-Z]{3}$' on the
        # live table. Normalizing here gives a clear, beginner-readable 422 instead of a raw
        # database error, and means "id"/"IDN"/" idn " all resolve to the same stored location.
        if value is None:
            return None
        cleaned = value.strip().upper()
        if not cleaned:
            return None
        if len(cleaned) != 3 or not cleaned.isalpha():
            raise ValueError("Country must be a 3-letter code, for example IDN or USA.")
        return cleaned


class EventCreate(BaseModel):
    # Kept as "document_id" for API/frontend compatibility -- a Document *is* a Phase 1 source
    # now (see project-knowledge/plans/2026-08-10-terra-space-supabase-transition.md), so this is
    # the id of the phase1_sources row the evidence quote must be found in.
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


class EventTypeCount(BaseModel):
    name: str
    count: int


class DashboardSummaryRead(BaseModel):
    total_events: int
    new_events: int
    by_event_type: list[EventTypeCount]
    incomplete_date_count: int
    incomplete_location_count: int
    exception_count: int = 0


class EventRead(BaseModel):
    id: str
    title: str
    summary: str
    event_date: str | None
    event_date_precision: DatePrecision | None
    epistemic_status: EpistemicStatus
    event_type: EventTypeRead | None
    actors: list[EventActorRead]
    locations: list[LocationRead]
    sources: list[EventSourceRead]
    duplicate_flags: list[DuplicateFlagRead]
    extraction_incomplete: bool
    extraction_incomplete_stages: list[str]
    created_at: datetime
    updated_at: datetime
    # Kept as "approved_at" for API/frontend compatibility, fed from the real `published_at`
    # column -- "published" is the correct term now, but this avoids renaming an already-shipped
    # field across the bridge and every frontend consumer for no functional gain.
    approved_at: datetime | None
    # Origin/authority fields -- see decisions/Fresh-Phase-Prefixed-Supabase-Architecture.md and
    # decisions/Automatic-Event-Visibility-With-Manual-Filtering.md. Optional so the handful of
    # remaining SQLite-only test helpers that build an EventRead by hand don't all need updating,
    # but every real code path (bridge and primary) always populates them.
    origin: Origin | None = None
    pipeline_outcome: PipelineOutcome | None = None
    dashboard_status: DashboardStatus | None = None
    exception_reason: str | None = None
    human_modified_at: datetime | None = None
    human_modified_fields: list[str] = Field(default_factory=list)
