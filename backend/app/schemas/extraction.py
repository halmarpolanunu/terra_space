from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

EpistemicStatus = Literal["confirmed", "claim", "rumor", "denied"]
DatePrecision = Literal["exact", "month", "year", "unknown"]


class ExtractedEventType(BaseModel):
    model_config = ConfigDict(extra="forbid")

    existing: str | None = Field(
        default=None,
        description="Exact name of a supplied active event type, or null when none fits.",
    )


class ExtractedLocation(BaseModel):
    country: str | None = Field(
        default=None,
        description=(
            "ISO 3166-1 alpha-2 country code, e.g. 'US', 'ID', 'IR'. Never the full "
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


class ExtractedActor(BaseModel):
    name: str
    role: Literal["source", "target"]
    existing: bool = True


class ExtractedEvent(BaseModel):
    title: str
    summary: str
    event_type: ExtractedEventType
    start_date: str | None = None
    start_date_precision: DatePrecision | None = None
    end_date: str | None = None
    end_date_precision: DatePrecision | None = None
    epistemic_status: EpistemicStatus
    locations: list[ExtractedLocation] = Field(
        default_factory=list,
        description=(
            "Every location this specific event took place in or is directly tied to, "
            "based on the document. Include indirect geographic references (straits, "
            "coastlines, regions) if the document connects them to this event. Empty "
            "only if the document gives no geographic detail for this event."
        ),
    )
    actors: list[ExtractedActor] = Field(default_factory=list)
    evidence_quote: str


class ExtractionResult(BaseModel):
    events: list[ExtractedEvent] = Field(default_factory=list)
