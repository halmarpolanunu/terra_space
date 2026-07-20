from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

ExtractionLogStage = Literal[
    "signal_parser", "event_type", "event_date", "locations", "actors", "persistence"
]
ExtractionLogOutcome = Literal["ok", "failed", "dropped"]


class ExtractionLogEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    candidate_index: int | None
    stage: ExtractionLogStage
    outcome: ExtractionLogOutcome
    detail: str
    created_at: datetime
