"""Schemas for the staged event detection pipeline: a Signal Parser call that splits a
document into candidates, then four narrow per-candidate classifiers, each doing exactly
one job."""

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.date_validation import validate_event_date
from app.schemas.extraction import DatePrecision, EpistemicStatus


class SignalCandidate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    working_title: str
    summary: str
    epistemic_status: EpistemicStatus
    evidence_quote: str


class SignalParseResult(BaseModel):
    candidates: list[SignalCandidate] = Field(default_factory=list)


class ClassifiedEventType(BaseModel):
    model_config = ConfigDict(extra="forbid")

    existing: str | None = Field(
        default=None,
        description="Exact name of a supplied active event type, or null when none fits.",
    )


class ClassifiedDate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event_date: str | None = None
    event_date_precision: DatePrecision | None = None

    @model_validator(mode="after")
    def validate_date_and_precision(self) -> "ClassifiedDate":
        validate_event_date(self.event_date, self.event_date_precision)
        return self


class ClassifiedLocation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    country: str | None = Field(
        default=None,
        description=(
            "ISO 3166-1 alpha-3 country code, e.g. 'USA', 'IDN', 'IRN'. Never the full "
            "country name. Null if no country is identifiable for this location."
        ),
    )
    admin1: str | None = Field(
        default=None,
        description=(
            "Province, state, or other first-level administrative division name. "
            "Null if not stated or clearly implied."
        ),
    )
    city_regency: str | None = Field(
        default=None,
        description="City or regency (district) name. Null if not stated or clearly implied.",
    )


class ClassifiedLocations(BaseModel):
    locations: list[ClassifiedLocation] = Field(default_factory=list)


class ClassifiedActors(BaseModel):
    source_actors: list[str] = Field(default_factory=list)
    recipient_actors: list[str] = Field(default_factory=list)
