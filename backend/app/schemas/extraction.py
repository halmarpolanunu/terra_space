from typing import Literal

from pydantic import BaseModel, Field

EpistemicStatus = Literal["confirmed", "claim", "rumor", "denied"]
DatePrecision = Literal["exact", "month", "year", "unknown"]


class ExtractedEventType(BaseModel):
    existing: str | None = None
    suggested: str | None = None


class ExtractedLocation(BaseModel):
    country: str | None = None
    admin1: str | None = None
    city_regency: str | None = None


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
    locations: list[ExtractedLocation] = Field(default_factory=list)
    actors: list[ExtractedActor] = Field(default_factory=list)
    evidence_quote: str


class ExtractionResult(BaseModel):
    events: list[ExtractedEvent] = Field(default_factory=list)
