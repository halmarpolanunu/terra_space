from pydantic import BaseModel, ConfigDict


class SettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    lm_studio_base_url: str
    lm_studio_model: str | None


class SettingsUpdate(BaseModel):
    lm_studio_base_url: str | None = None
    lm_studio_model: str | None = None


class LmStudioTestRequest(BaseModel):
    base_url: str | None = None


class LmStudioTestResult(BaseModel):
    reachable: bool
    models: list[str]
    message: str
