from typing import Literal

from pydantic import BaseModel

ServiceState = Literal["available", "missing", "offline", "error"]


class HealthResponse(BaseModel):
    app: ServiceState
    storage: ServiceState
    map: ServiceState
    lm_studio: ServiceState
