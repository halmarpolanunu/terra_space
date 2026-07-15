from pydantic import BaseModel, ConfigDict, Field


class SettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    lm_studio_base_url: str
    lm_studio_model: str | None
    lm_studio_extraction_timeout_seconds: int


class SettingsUpdate(BaseModel):
    lm_studio_base_url: str | None = None
    lm_studio_model: str | None = None
    lm_studio_extraction_timeout_seconds: int | None = Field(default=None, ge=120, le=600)


class LmStudioTestRequest(BaseModel):
    base_url: str | None = None


class LmStudioTestResult(BaseModel):
    reachable: bool
    models: list[str]
    message: str
