from typing import Literal

from pydantic import BaseModel

DuplicateResolutionChoice = Literal["kept_separate", "linked"]


class DuplicateResolveRequest(BaseModel):
    resolution: DuplicateResolutionChoice
