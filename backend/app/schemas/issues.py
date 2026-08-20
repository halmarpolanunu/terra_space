"""Read models for validated, article-level Issue-first analysis data.

These models deliberately contain no create, update, or review inputs.  The parallel pipeline is
the only system allowed to correct Issue-first records; Terra Insight only reads its valid output.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class IssueListItem(BaseModel):
    id: str
    source_id: str
    source_title: str
    label: str
    summary: str
    evidence_quote: str
    processed_at: datetime
    created_at: datetime


class IssueEventRead(BaseModel):
    id: str
    title: str
    evidence_quote: str
    created_at: datetime


class IssueDetail(IssueListItem):
    events: list[IssueEventRead] = Field(default_factory=list)


class ActorLocationRead(BaseModel):
    id: str
    label: str
    latitude: float
    longitude: float
    evidence_quote: str


class ActorEndpointRead(BaseModel):
    role: Literal["source", "target"]
    actor_name: str
    evidence_quote: str
    location: ActorLocationRead


class ActorRelationshipRead(BaseModel):
    id: str
    evidence_quote: str
    source: ActorEndpointRead
    target: ActorEndpointRead


class IssueEventDetail(IssueEventRead):
    relationships: list[ActorRelationshipRead] = Field(default_factory=list)
