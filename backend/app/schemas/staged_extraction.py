"""Schemas for the staged event detection pipeline: a Signal Parser call that splits a
document into candidates, followed (in later tasks) by narrow per-candidate classifiers."""

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.extraction import EpistemicStatus


class SignalCandidate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    working_title: str
    summary: str
    epistemic_status: EpistemicStatus
    evidence_quote: str


class SignalParseResult(BaseModel):
    candidates: list[SignalCandidate] = Field(default_factory=list)
